import * as livekit from 'livekit-client';

let startTime: number;

// @ts-ignore
window.connectToLiveKit = async (token: string) => {
    const room = new livekit.Room({});

    //await room.connect('wss://dan.staging.livekit.cloud', "token");
    room
      .on(livekit.RoomEvent.ParticipantConnected, participantConnected)
      .on(livekit.RoomEvent.LocalTrackPublished, () => {
        renderParticipant(room.localParticipant);
      })
      .on(livekit.RoomEvent.TrackSubscribed, (_1, pub, participant) => {
        console.log('subscribed to track', pub.trackSid, participant.identity);
        renderParticipant(participant);
      })
      .on(livekit.RoomEvent.SignalConnected, async () => {
        const signalConnectionTime = Date.now() - startTime;
        console.log(`signal connection established in ${signalConnectionTime}ms`);
        await Promise.all([
            room.localParticipant.setCameraEnabled(true),
            room.localParticipant.setMicrophoneEnabled(true),
        ]);
      });

    startTime = Date.now();
    await room.connect('wss://dan.staging.livekit.cloud', token);
    console.log('connected to room', room);

    room.participants.forEach((participant) => {
        participantConnected(participant);
    });
    participantConnected(room.localParticipant);
};

const $ = (id: string) => document.getElementById(id);

// updates participant UI
function renderParticipant(participant: livekit.Participant, remove: boolean = false) {
  const container = $('participants-area');
  if (!container) return;
  const { identity } = participant;
  let div = $(`participant-${identity}`);
  if (!div && !remove) {
    div = document.createElement('div');
    div.id = `participant-${identity}`;
    div.className = 'participant';
    div.innerHTML = `
      <video id="video-${identity}"></video>
      <audio id="audio-${identity}"></audio>
      <div class="info-bar">
        <div id="name-${identity}" class="name">
        </div>
        <div style="text-align: center;">
          <span id="codec-${identity}" class="codec">
          </span>
          <span id="size-${identity}" class="size">
          </span>
          <span id="bitrate-${identity}" class="bitrate">
          </span>
        </div>
        <div class="right">
          <span id="signal-${identity}"></span>
          <span id="mic-${identity}" class="mic-on"></span>
        </div>
      </div>
      ${
        participant instanceof livekit.RemoteParticipant &&
        `<div class="volume-control">
        <input id="volume-${identity}" type="range" min="0" max="1" step="0.1" value="1" orient="vertical" />
      </div>`
      }

    `;
    container.appendChild(div);

    const sizeElm = $(`size-${identity}`);
    const videoElm = <HTMLVideoElement>$(`video-${identity}`);
    videoElm.onresize = () => {
      updateVideoSize(videoElm!, sizeElm!);
    };
  }
  const videoElm = <HTMLVideoElement>$(`video-${identity}`);
  const audioELm = <HTMLAudioElement>$(`audio-${identity}`);
  if (remove) {
    div?.remove();
    if (videoElm) {
      videoElm.srcObject = null;
      videoElm.src = '';
    }
    if (audioELm) {
      audioELm.srcObject = null;
      audioELm.src = '';
    }
    return;
  }

  // update properties
  $(`name-${identity}`)!.innerHTML = participant.identity;
  if (participant instanceof livekit.LocalParticipant) {
    $(`name-${identity}`)!.innerHTML += ' (you)';
  }
  const micElm = $(`mic-${identity}`)!;
  const signalElm = $(`signal-${identity}`)!;
  const cameraPub = participant.getTrack(livekit.Track.Source.Camera);
  const micPub = participant.getTrack(livekit.Track.Source.Microphone);
  if (participant.isSpeaking) {
    div!.classList.add('speaking');
  } else {
    div!.classList.remove('speaking');
  }

  if (participant instanceof livekit.RemoteParticipant) {
    const volumeSlider = <HTMLInputElement>$(`volume-${identity}`);
    volumeSlider.addEventListener('input', (ev) => {
      participant.setVolume(Number.parseFloat((ev.target as HTMLInputElement).value));
    });
  }

  const cameraEnabled = cameraPub && cameraPub.isSubscribed && !cameraPub.isMuted;
  if (cameraEnabled) {
    if (participant instanceof livekit.LocalParticipant) {
      // flip
      videoElm.style.transform = 'scale(-1, 1)';
    } else if (!cameraPub?.videoTrack?.attachedElements.includes(videoElm)) {
      const renderStartTime = Date.now();
      // measure time to render
      videoElm.onloadeddata = () => {
        const elapsed = Date.now() - renderStartTime;
        let fromJoin = 0;
        if (participant.joinedAt && participant.joinedAt.getTime() < startTime) {
          fromJoin = Date.now() - startTime;
        }
        console.log(
          `RemoteVideoTrack ${cameraPub?.trackSid} (${videoElm.videoWidth}x${videoElm.videoHeight}) rendered in ${elapsed}ms`,
          fromJoin > 0 ? `, ${fromJoin}ms from start` : '',
        );
      };
    }
    cameraPub?.videoTrack?.attach(videoElm);
  } else {
    // clear information display
    $(`size-${identity}`)!.innerHTML = '';
    if (cameraPub?.videoTrack) {
      // detach manually whenever possible
      cameraPub.videoTrack?.detach(videoElm);
    } else {
      videoElm.src = '';
      videoElm.srcObject = null;
    }
  }

  const micEnabled = micPub && micPub.isSubscribed && !micPub.isMuted;
  if (micEnabled) {
    if (!(participant instanceof livekit.LocalParticipant)) {
      // don't attach local audio
      audioELm.onloadeddata = () => {
        if (participant.joinedAt && participant.joinedAt.getTime() < startTime) {
          const fromJoin = Date.now() - startTime;
          console.log(`RemoteAudioTrack ${micPub?.trackSid} played ${fromJoin}ms from start`);
        }
      };
      micPub?.audioTrack?.attach(audioELm);
    }
    micElm.className = 'mic-on';
    micElm.innerHTML = '<i class="fas fa-microphone"></i>';
  } else {
    micElm.className = 'mic-off';
    micElm.innerHTML = '<i class="fas fa-microphone-slash"></i>';
  }

  switch (participant.connectionQuality) {
    case livekit.ConnectionQuality.Excellent:
    case livekit.ConnectionQuality.Good:
    case livekit.ConnectionQuality.Poor:
      signalElm.className = `connection-${participant.connectionQuality}`;
      signalElm.innerHTML = '<i class="fas fa-circle"></i>';
      break;
    default:
      signalElm.innerHTML = '';
    // do nothing
  }
}

function updateVideoSize(element: HTMLVideoElement, target: HTMLElement) {
    target.innerHTML = `(${element.videoWidth}x${element.videoHeight})`;
}

function participantConnected(participant: livekit.Participant) {
  console.log('participant', participant.identity, 'connected', participant.metadata);
  participant
    .on(livekit.ParticipantEvent.TrackMuted, (pub: livekit.TrackPublication) => {
      console.log('track was muted', pub.trackSid, participant.identity);
      renderParticipant(participant);
    })
    .on(livekit.ParticipantEvent.TrackUnmuted, (pub: livekit.TrackPublication) => {
      console.log('track was unmuted', pub.trackSid, participant.identity);
      renderParticipant(participant);
    })
    .on(livekit.ParticipantEvent.IsSpeakingChanged, () => {
      renderParticipant(participant);
    })
    .on(livekit.ParticipantEvent.ConnectionQualityChanged, () => {
      renderParticipant(participant);
    });
}
