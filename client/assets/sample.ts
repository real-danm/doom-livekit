import * as livekit from 'livekit-client';
//import * as livekitApi from 'livekit-server-sdk';

//const roomName = 'name-of-room';
//const participantName = 'user-name';
//const at = new livekitApi.AccessToken('APIdVQYDzMshqax', 'toNltPyZ8xiRDzese7hbdKUd2S6lpfyrs0DiASgRfPuB', { identity: participantName })
//at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
//const token = at.toJwt();
//console.log(token);

// creates a new room with options
const room = new livekit.Room({
  });

await room.connect('wss://dan.staging.livekit.cloud', "token");
console.log('connected to room', room);
console.log('hello there')
// connect to room
