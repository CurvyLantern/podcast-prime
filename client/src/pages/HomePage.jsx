import * as msc from "mediasoup-client";
import { useRef } from "react";
import socketEvents from "@/utils/socketEvents";
import io from "socket.io-client";
import { useEffect } from "react";
import { useState } from "react";

const api = "https://localhost:8000";
const socketClient = io(`${api}/mediasoup`);

const device = new msc.Device();

console.log({ device });

const HomePage = () => {
  const [routerRtpCapabilities, setRouterRtpCapabilities] = useState({});
  const myVideoEl = useRef(null);
  const getLocalVideo = async () => {
    const vTrack = await navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: true,
    });

    if (vTrack) {
      myVideoEl.current.srcObject = vTrack;
    } else {
      console.error("no video track was found");
    }
  };
  const getRtpCapabilities = () => {
    socketClient.emit();
  };

  const createDevice = async () => {
    try {
      const device = new msc.Device();
      await device.load({
        routerRtpCapabilities,
      });

      console.log({ routerRtpCapabilities });
    } catch (error) {
      console.log(error.message);
    }
  };

  const createSendTransport = () => {
    return null;
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

      cb: createConsumer,
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
            muted></video>
        </div>
        <div className="w-96 h-64 shadow-md rounded-md bg-neutral-800"></div>
      </div>

      {/* controls */}
      <div className="mt-10 flex flex-col p-5 bg-red-400 gap-2">
        {workProcess.map((prc, prcIndex) => {
          return (
            <div
              key={prcIndex}
              className="">
              <button
                onClick={() => {
                  prc.cb();
                }}
                className="px-5 py-3 bg-white ">
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
