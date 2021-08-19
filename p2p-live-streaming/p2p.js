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

//TODO: handle missed video chunk
//TODO: viewer receive timestamp from host

document.addEventListener("DOMContentLoaded", async () => {
   // Create our libp2p node
   // const ws = new WebRTCStar({ upgrader });
   const libp2p = await Libp2p.create({
      addresses: {
         // Add the signaling server address, along with our PeerId to our multiaddrs list
         // libp2p will automatically attempt to dial to the signaling server so that it can
         // receive inbound connections from other peers
         listen: [
            //"/dns4/wrtc-star1.par.dwebops.pub/tcp/443/wss/p2p-webrtc-star",
            //"/dns4/wrtc-star2.sjc.dwebops.pub/tcp/443/wss/p2p-webrtc-star"
            //"/ip4/127.0.0.1/tcp/13579/ws/p2p-webrtc-star/" // localhost
            "/dns4/fyp-signaling-server.herokuapp.com/tcp/443/wss/p2p-webrtc-star/"
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

   // UI elements
   const status = document.getElementById("status");
   const output = document.getElementById("output");

   // output.textContent = '';

   function log(txt) {
      console.info(txt);
      // =]output.textContent += `${txt.trim()}\n`
   }

   // Listen for new peers
   libp2p.on("peer:discovery", (peerId) => {
      log(`Found peer ${peerId.toB58String()}`);
   });

   // Listen for new connections to peers
   libp2p.connectionManager.on("peer:connect", (connection) => {
      log(`Connected to ${connection.remotePeer.toB58String()}`);
   });

   // Listen for peers disconnecting
   libp2p.connectionManager.on("peer:disconnect", (connection) => {
      log(`Disconnected from ${connection.remotePeer.toB58String()}`);
   });

   // setup Kad DHT
   /*
   const customDHT = new KadDHT({
      libp2p,
      dialer: libp2p.dialer,
      peerId: libp2p.peerId,
      peerStore: libp2p.peerStore,
      registrar: libp2p.registrar,
      datastore: libp2p.datastore, //
      protocolPrefix: "/custom",
      kBucketSize: 20,
      randomWalk: {
         enabled: false,
         interval: 300e3,
         timeout: 10e3
      }
   });
   customDHT.onPut = () => console.log("customDHT receives put value");
   window.customDHT = customDHT;
   customDHT.start();
   customDHT.on("peer", libp2p._onDiscoveryPeer);
   */

   await libp2p.start();
   console.log("libp2p started!");
   log(`libp2p id is ${libp2p.peerId.toB58String()}`);

   window.customDHT = libp2p._dht;
   window.libp2p = libp2p;
});
