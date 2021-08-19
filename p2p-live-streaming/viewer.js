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

// download video to disk, for debugging
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

// Record parameters

//let ideal_chunk_num = 0;
let chunk_num_to_fetch = 0;

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

      mse_buffer.push(webcamData);
      if (!updatingBuffer) {
         updatingBuffer = true;
         if (!sourceBuffer.updating) {
            console.log("Appending to MSE buffer");
            if (mse_buffer.length != 0)
               sourceBuffer.appendBuffer(mse_buffer.shift());
         } else {
            console.warn("MSE Buffer still updating... ");
         }
         updatingBuffer = false;
      }
   }
};

const fetch_video = async () => {
   let hash = await multihashing(
      new TextEncoder("utf8").encode(chunk_num_to_fetch),
      "sha2-256"
   );
   customDHT.get(hash).then(function (res) {
      mse_buffer.push(res);
      if (!updatingBuffer) {
         updatingBuffer = true;
         if (!sourceBuffer.updating) {
            console.log("Appending to MSE buffer");
            if (mse_buffer.length != 0)
               sourceBuffer.appendBuffer(mse_buffer.shift());
         } else {
            console.warn("MSE Buffer still updating... ");
         }
         updatingBuffer = false;
      }
   });
};

// Setup MSE

var mediaSource = new MediaSource();
var mse_buffer = [];
window.mse_buffer = mse_buffer;
var url = URL.createObjectURL(mediaSource);

var video = document.getElementById("output-video");
video.src = url;

var sourceBuffer = null;
var updatingBuffer = false;
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

///////////////////////////////////////// - Main Function

(async () => {
   // p2p
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
            /*
            [Bootstrap.tag]: {
               enabled: true,
               list: [
                  "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
                  "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
                  "/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp",
                  "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
                  "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt"
               ]
            },
            */
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

   // start video fetch loop
   let request = new XMLHttpRequest();
   request.open(
      "GET",
      "http://localhost:24689/get"
      //"https://fyp-timestamp-server.herokuapp.com/get"
   );

   request.responseType = "text";
   request.onload = function () {
      chunk_num_to_fetch = request.response;
      fetch_video();
      setInterval(() => {
         chunk_num_to_fetch++;
         fetch_video();
         // fetch video a little before chunk expire
         /*
      setTimeout(()=>{
         fetch_video();
      }, 4400);
      */
      }, 5000);
   };
   request.send();
})();
