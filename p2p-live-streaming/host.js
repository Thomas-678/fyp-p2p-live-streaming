/*
const { createFFmpeg, fetchFile } = require("@ffmpeg/ffmpeg");
const ffmpeg = createFFmpeg({
   log: false
});
*/

// p2p-related imports
import "babel-polyfill";
import Libp2p from "libp2p";
import Websockets from "libp2p-websockets";
import WebRTCStar from "libp2p-webrtc-star";
const pipe = require("it-pipe");
const { collect } = require("streaming-iterables");
import { NOISE } from "libp2p-noise";
import Mplex from "libp2p-mplex";
import Bootstrap from "libp2p-bootstrap";
const KadDHT = require("libp2p-kad-dht");
const transportKey = WebRTCStar.prototype[Symbol.toStringTag];
const CID = require("cids");
window.CID = CID;
const multihashing = require("multihashing-async");
window.multihashing = multihashing;

// Setup recording

var mediaSource = new MediaSource();
var mse_buffer = [];
window.mse_buffer = mse_buffer;
var ffmpeg_running = false;
var url = URL.createObjectURL(mediaSource);

var video = document.getElementById("output-video");
video.src = url;

var sourceBuffer = null;
var updatingBuffer = false;
var initSegDone = false;
window.initSegDone = initSegDone;
mediaSource.addEventListener("sourceopen", function () {
   // sourceBuffer = mediaSource.addSourceBuffer("video/webm; codecs=\"opus,vp8\"");
   sourceBuffer = mediaSource.addSourceBuffer(
      // 'video/mp4; codecs="avc1.4D4028, mp4a.40.2"' // used with ffmpeg
      'video/webm; codecs="opus,vp8"' // native MediaRecorder
   );
   //sourceBuffer = mediaSource.addSourceBuffer("video/mp4; codecs=\"avc1.4d002a\"");
   sourceBuffer.mode = "sequence";
   window.sourceBuffer = sourceBuffer;

   sourceBuffer.addEventListener("onupdateend", function () {
      if (mse_buffer.length) {
         sourceBuffer.appendBuffer(mse_buffer.shift());
      }
   });
});

const webcam = document.getElementById("webcam");
const chunks_before_ffmpeg = [];
var cnt = 0; // counter for video chunks

function download(data, filename, type) {
   var file = new Blob([data], { type: type });
   if (window.navigator.msSaveOrOpenBlob)
      // IE10+
      window.navigator.msSaveOrOpenBlob(file, filename);
   else {
      // Others
      var a = document.createElement("a"),
         url = URL.createObjectURL(file);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
         document.body.removeChild(a);
         window.URL.revokeObjectURL(url);
      }, 0);
   }
}

const loop_NO_transcode = async () => {
   while (chunks_before_ffmpeg.length != 0) {
      let buf = chunks_before_ffmpeg.shift();
      let chunk_no = buf[0];
      // webcamData = new Uint8Array(await buf[1].arrayBuffer());
      let webcamData = new Uint8Array(await buf[1].arrayBuffer());
      console.log("chunk_no: " + chunk_no);

      // For p2p network
      let hash = await multihashing(
         new TextEncoder("utf8").encode("" + chunk_no),
         "sha2-256"
      );
      customDHT.put(hash, webcamData);

      // Push chunk for MSE player, for mirroring video locally

      // download(webcamData, "out.mp4", "");

      // if (chunk_no % 3 === 2)
      //    // skip 1 chunk every 3 chunk
      //    console.log("skip 1 chunk");
      // else
      mse_buffer.push(webcamData);
      initSegDone = true;
      if (!updatingBuffer) {
         updatingBuffer = true;
         if (!sourceBuffer.updating) {
            console.log("Appending to MSE buffer");
            // if (false && cnt % 2 ==0)
            //     console.log("Skip 1 chunk");
            // else
            if (mse_buffer.length != 0)
               sourceBuffer.appendBuffer(mse_buffer.shift());
         } else {
            console.warn("MSE Buffer still updating... ");
         }
         updatingBuffer = false;
      }
   }
};

///////////////////////////////////////// - Main Function

(async () => {
   // p2p
   //*
   const libp2p = await Libp2p.create({
      addresses: {
         // Add the signaling server address, along with our PeerId to our multiaddrs list
         // libp2p will automatically attempt to dial to the signaling server so that it can
         // receive inbound connections from other peers
         listen: [
            //"/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star",
            //"/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star"
            "/ip4/127.0.0.1/tcp/13579/ws/p2p-webrtc-star/" // localhost
            //"/dns4/fyp-signaling-server.herokuapp.com/tcp/443/wss/p2p-webrtc-star/"
         ]
      },
      modules: {
         transport: [WebRTCStar],
         connEncryption: [NOISE],
         dht: KadDHT,
         streamMuxer: [Mplex],
         peerDiscovery: []
         //peerRouting: [KadDHT]
      },
      config: {
         transport: {
            [transportKey]: {
               listenerOptions: {
                  config: {
                     iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }]
                     //{"urls": ["turn:YOUR.TURN.SERVER:3478"], "username": "YOUR.USER", "credential": "YOUR.PASSWORD"}
                  }
               }
            }
         },
         dht: {
            // The DHT options (and defaults) can be found in its documentation
            autoDial: true,
            kBucketSize: 20,
            enabled: true,
            randomWalk: {
               enabled: true, // Allows to disable discovery (enabled by default)
               interval: 300e3,
               timeout: 10e3
            }
         },

         peerDiscovery: {
            autoDial: true
            // The `tag` property will be searched when creating the instance of your Peer Discovery service.
            // The associated object, will be passed to the service when it is instantiated.
         },
         peerRouting: {
            // Peer routing configuration
            refreshManager: {
               // Refresh known and connected closest peers
               enabled: true, // Should find the closest peers.
               interval: 6e5, // Interval for getting the new for closest peers of 10min
               bootDelay: 10e3 // Delay for the initial query for closest peers
            }
         }
      }
   });

   libp2p.on("peer:discovery", (peerId) => {
      console.info(`Found peer ${peerId.toB58String()}`);
   });

   // Listen for new connections to peers
   libp2p.connectionManager.on("peer:connect", (connection) => {
      console.info(`Connected to ${connection.remotePeer.toB58String()}`);
   });

   // Listen for peers disconnecting
   libp2p.connectionManager.on("peer:disconnect", (connection) => {
      console.info(`Disconnected from ${connection.remotePeer.toB58String()}`);
   });

   await libp2p.start();
   console.info(`libp2p id is ${libp2p.peerId.toB58String()}`);
   console.log("libp2p started!");

   window.customDHT = libp2p._dht;
   var customDHT = libp2p._dht;
   window.libp2p = libp2p;

   //*/
   // Webcam
   webcam.srcObject = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
   });
   await webcam.play();
   // Start Record loop
   // Invoke function immediately and set repeat interval
   let timestamp_synced = false;
   let request = new XMLHttpRequest();
   request.open(
      "GET",
      "http://localhost:24689/set/0"
      //"https://fyp-timestamp-server.herokuapp.com/set/0"
   );
   request.responseType = "text";

   setInterval(
      (function recordLoop() {
         // const options = { mimeType: "video/webm;codecs=h264" }; // fastest, used with ffmpeg
         const options = { mimeType: 'video/webm; codecs="opus,vp8"' }; // native with MSE
         const recorder = new MediaRecorder(webcam.srcObject, options);
         window.recorder = recorder;
         const chunks = [];
         recorder.ondataavailable = (e) => chunks.push(e.data);
         recorder.onstop = (e) => {
            chunks_before_ffmpeg.push([++cnt, new Blob(chunks)]);

            // version1 ffmpeg each chunk
            /*
            if (!ffmpeg_running) {
               ffmpeg_running = true;
               loop_transcode();
            }
            //*/

            //version2 restart MediaRecorder to get independent chunks
            loop_NO_transcode();
         };

         setTimeout(() => recorder.stop(), 5000);
         recorder.start();
         return recordLoop;
      })(),
      5000
   );
   request.send();
})();
