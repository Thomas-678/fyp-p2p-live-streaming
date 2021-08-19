## Running the app on your computer

This application requires Node.js version 14 to be installed.
The live streaming app requires two auxillary servers to function:

Signaling Server: Helps two WebRTC peers establish connections and keep track of peers in the live stream.  
Timestamp Server: Notify new peer of the live stream's current timestamp.

## Procedures to run the apps

##### Signalling Server

    cd signaling-server
    npm install
    npm start

##### Timestamp Server

    cd timestamp-server
    npm install
    npm start

##### Live streaming app

    cd p2p-live-streaming
    npm install
    // For live stream Host:
    npm start
    // For live stream Viewer
    npm run-script viewer
