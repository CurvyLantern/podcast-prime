import * as msc from "mediasoup-client";
import { useRef } from "react";
import socketEvents from "@/utils/socketEvents";
import io from "socket.io-client";
import { useEffect } from "react";
import { useState } from "react";

const api = "https://localhost:8000";
const socketClient = io(`${api}/mediasoup`);

const trackParams = {
  encoding: [
    {
      rid: "r0",
      maxBitrate: 100000,
      scalabilityMode: "S1T3",
    },
    {
      rid: "r1",
      maxBitrate: 300000,
      scalabilityMode: "S1T3",
    },
    {
      rid: "r2",
      maxBitrate: 900000,
      scalabilityMode: "S1T3",
    },
  ],
  codecOptions: {
    videoGoogleStartBitrate: 1000,
  },
};

const HomePage = () => {
  const [routerRtpCapabilities, setRouterRtpCapabilities] = useState({});
  const [device, setDevice] = useState(null);
  const [producerTp, setProducerTp] = useState(null);
  const myVideoEl = useRef(null);
  const [stream, setStream] = useState(null);

  // get local video
  const getLocalVideo = async () => {
    const _stream = await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: true,
    });
    setStream(_stream);

    if (_stream) {
      myVideoEl.current.srcObject = _stream;
    } else {
      console.error("no video track was found");
    }
  };

  const getRtpCapabilities = () => {
    console.log({ routerRtpCapabilities });
  };

  // create a device with rtp capabilities
  const createDevice = async () => {
    if (device) return;
    try {
      const _device = new msc.Device();
      await _device.load({
        routerRtpCapabilities,
      });
      setDevice(_device);

      console.log({ _device, device });
    } catch (error) {
      console.log(error.message);
    }
  };

  // create a send transport
  const createSendTransport = () => {
    socketClient.emit(
      socketEvents.createWebrtcTransport,
      { sender: true },
      ({ params }) => {
        if (params.error) {
          console.log(params.error);
          return;
        }
        console.log(`params received from send transport `, params);

        const _producerTp = device.createSendTransport(params);
        setProducerTp(_producerTp);
        _producerTp.on("connect", async ({ dtlsParameters }, cb, errCb) => {
          try {
            socketClient.emit(socketEvents.transportConnect, {
              transportId: _producerTp.id,
              dtlsParameters,
            });

            cb();
          } catch (error) {
            errCb(error);
          }
        });

        _producerTp.on("produce", async (params, cb, errCb) => {
          console.log(`params from producer tp produce event`, params);

          try {
            await socketClient.emit(
              socketEvents.transportProduce,
              {
                transportId: _producerTp.id,
                kind: params.kind,
                rtpParams: params.rtpPaarameters,
                appData: params.appData,
              },
              ({ id }) => {
                cb({ id });
              }
            );
          } catch (err) {
            errCb(err);
          }
        });
      }
    );
    return null;
  };

  const connectSendTransport = async () => {
    const producer = await producerTp.produce({
      track: stream.getVideoTracks()[0],
      ...trackParams,
    });
    producer.on("trackended", () => {
      console.log("track-ended");
      //close video
    });

    producer.on("transportclose", () => {
      console.log("transport for this producer closed");

      producer.close();
    });
  };

  const createConsumer = () => {
    return null;
  };

  const workProcess = [
    {
      label: "get local video",
      cb: getLocalVideo,
    },
    {
      label: "get rtp capabilities",

      cb: getRtpCapabilities,
    },
    {
      label: "create device",

      cb: createDevice,
    },
    {
      label: "create send transport",

      cb: createSendTransport,
    },
    {
      label: "connect send transport & produce",

      cb: connectSendTransport,
    },
    {
      label: "create recv transport",

      cb: getLocalVideo,
    },
    {
      label: "connect rect producer & consume",
      cb: getLocalVideo,
    },
  ];

  useEffect(() => {
    const connectionCb = (data) => {
      setRouterRtpCapabilities((prev) => ({
        ...data.routerRtpCapabilities,
        ...prev,
      }));
      console.log({ data });
    };
    socketClient.on(socketEvents.connectionSuccess, connectionCb);
    return () => {
      socketClient.off(socketEvents.connectionSuccess, connectionCb);
    };
  }, []);

  return (
    <div className="p-10 bg-neutral-600 h-full">
      <div className="flex gap-5">
        {/* display */}
        <div className="w-96 h-64 shadow-md rounded-md bg-neutral-800">
          <video
            className="w-full h-full"
            ref={myVideoEl}
            autoPlay
            playsInline
            muted
          ></video>
        </div>
        <div className="w-96 h-64 shadow-md rounded-md bg-neutral-800"></div>
      </div>

      {/* controls */}
      <div className="mt-10 flex flex-col p-5 bg-red-400 gap-2">
        {workProcess.map((prc, prcIndex) => {
          return (
            <div key={prcIndex} className="">
              <button
                onClick={() => {
                  prc.cb();
                }}
                className="px-5 py-3 bg-white "
              >
                {prcIndex + 1 + " " + prc.label}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HomePage;
