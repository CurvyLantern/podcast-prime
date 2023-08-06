import "dotenv/config.js";
import express from "express";
import http from "http";
import https from "https";
import * as mediasoup from "mediasoup";
import os from "os";
import fs from "fs";
import socketEvents from "./essentials/socketEvents.js";
import * as socketIo from "socket.io";
import cors from "cors";
import { PORT } from "./essentials/env.js";

const app = express();
// const server = http.createServer(app);

const httpsOptions = {
  key: fs.readFileSync("./ssl/key.pem", "utf-8"),
  cert: fs.readFileSync("./ssl/cert.pem", "utf-8"),
};
const serverHttps = https.createServer(httpsOptions, app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", function (req, res) {
  res.json({ hello: "mom" });
});
app.get("/media", function (req, res) {
  res.json({ what: "something went woo woo" });
});

serverHttps.listen(PORT, () => {
  console.log(`server listening to port ${PORT}`);
});

const io = new socketIo.Server(serverHttps, {
  cors: {
    origin: "*",
    methods: "*",
  },
});

const peers = io.of("/mediasoup");

let mWorkerPromise = createMworker();

const mediaCodecs = [
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
  },
  {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
      "x-google-start-bitrate": 1000,
    },
  },
];

/**
 * @type mediasoup.types.Router
 *
 */
let mRouter;
peers.on(socketEvents.onConnnection, async (socket) => {
  console.log(socket.id);

  socket.on(socketEvents.onDisconnect, () => {
    console.log("peer disconnected");
  });
  mRouter = await (
    await mWorkerPromise
  ).createRouter({
    mediaCodecs,
  });

  console.log(mRouter.rtpCapabilities);

  socket.emit(socketEvents.connectionSuccess, {
    socketId: socket.id,
    routerRtpCapabilities: mRouter.rtpCapabilities ?? {},
  });

  let producerTransport;
  socket.on(socketEvents.createWebrtcTransport, async ({ sender }, cb) => {
    console.log(`Is this a sender request ? ${sender}`);
    if (sender) {
      producerTransport = await createWebrtcTransport(cb);
    } else {
      const consumerTransport = await createWebrtcTransport(cb);
    }
  });

  socket.on(
    socketEvents.transportConnect,
    async ({ transportId, dtlsParameters }, cb) => {
      console.log("DTLS PARAMS");
      await producerTransport.connect({ dtlsParameters });
    }
  );
  let producer;
  socket.on(
    socketEvents.transportProduce,
    async ({ kind, rtpParameters, appData }, cb) => {
      producer = await producerTransport.produce({ kind, rtpParameters });

      producer.on("transportCLose", () => {
        console.log("transport for this producer closed");
        producer.close();
      });

      cb({ id: producer.id });
    }
  );
});

async function createWebrtcTransport(cb) {
  try {
    const webRtcTransportOptions = {
      listenIps: [
        {
          ip: "127.0.0.1",
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    };
    const transport = await mRouter.createWebRtcTransport(
      webRtcTransportOptions
    );

    console.log(`transport id : ${transport.id}`);

    transport.on("dtlsstatechange", (dtlsState) => {
      if (dtlsState === "closed") {
        transport.close();
      }
    });
    transport.on("@close", () => {
      console.log("transport closed");
    });

    cb({
      params: {
        id: transport.id,
        icePrams: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParams: transport.dtlsParameters,
      },
    });

    return transport;
  } catch (error) {}
}

async function createMworker() {
  const worker = await mediasoup.createWorker({
    rtcMinPort: 2000,
    rtcMaxPort: 2600,
  });
  console.log(`worker pid ${worker.pid}`);
  worker.on("died", (error) => {
    console.error("mediasoup worker has died");
    setTimeout(() => process.exit(1), 2000);
  });

  return worker;
}
