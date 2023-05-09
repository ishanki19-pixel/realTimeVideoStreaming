console.log("In main.js!")
var mapPeers={};

var usernameInput=document.querySelector('#username');
var btnJoin=document.querySelector('#btn-join');

var username;
var webSocket;

// Function of webSocketOnMessage----------------------------------->

function webSocketOnMessage(event)
{
    var parsedData=JSON.parse(event.data);
    var peerUsername=parsedData['peer'];
    var action=parsedData['action'];
    if(username==peerUsername)
        return;
    var receiver_channel_name=parsedData['message']['receiver_channel_name'];
    if(action=='new-peer')
        createOfferer(peerUsername,receiver_channel_name);
    if(action=='new-offer')
    {
        var offer=parsedData['message']['sdp'];
        createAnswerer(offer,peerUsername,receiver_channel_name);
    }
    if(action=='new-answer')
    {
        var answer=parsedData['message']['sdp'];
        var peer=mapPeers[peerUsername][0];
        peer.setRemoteDescription(answer);
        return ;
    }
}
// ---------what will happen next after the join button is clicked------------------->

btnJoin.addEventListener('click',()=>{
    username=usernameInput.value;
    console.log('username :', username);
    if(username=='')
    {
        return ;
    }
    usernameInput.value='';
    usernameInput.disabled=true;
    usernameInput.style.visibility='hidden';
    btnJoin.disabled=true;
    btnJoin.style.visibility='hidden';
    var labelUsername=document.querySelector('#label-username');
    labelUsername.innerHTML=username;
    var loc=window.location;
    var wsStart='ws://';
    if(loc.protocol=='https:')
    {
        wsStart='wss://'
    }
    var endPoint=wsStart+loc.host+loc.pathname;
    console.log('endPoint: ',endPoint);
    webSocket= new WebSocket(endPoint);
    webSocket.addEventListener('open',(e)=>{
        console.log('Connection Opened!');
        sendSignal('new-peer',{});
    });
    webSocket.addEventListener('message',webSocketOnMessage);
    webSocket.addEventListener('close',(e)=>{
        console.log('Connection Closed!')
    });
    webSocket.addEventListener('error',(e)=>{
        console.log('Error Occurred!')
    });
})

// -----------settings for displaying the video and the audio using webrtc API---------------------->

var localStream =new MediaStream();
const constraints ={
    'video':true,
    'audio':true
};
const localVideo=document.querySelector('#video');
const btnToggleAudio=document.querySelector('#btn-toggle-audio');
const btnToggleVideo=document.querySelector('#btn-toggle-video');
var userMedia=navigator.mediaDevices.getUserMedia(constraints)
    .then(stream=>{
        localStream=stream;
        localVideo.srcObject=localStream;
        localVideo.muted=true;
        var audioTracks=stream.getAudioTracks();
        var videoTracks=stream.getVideoTracks();
        audioTracks[0].enabled=true;
        videoTracks[0].enabled=true;
        btnToggleAudio.addEventListener('click',()=>{
            audioTracks[0].enabled=!audioTracks[0].enabled;
            if(audioTracks[0].enabled)
            {
                btnToggleAudio.innerHTML='Audio Mute';
                return ;
            }
            btnToggleAudio.innerHTML='Audio Unmute';
        });
        btnToggleVideo.addEventListener('click',()=>{
            videoTracks[0].enabled=!videoTracks[0].enabled;
            if(videoTracks[0].enabled)
            {
                btnToggleVideo.innerHTML='Video Off';
                return ;
            }
            btnToggleVideo.innerHTML='Video On';
        });
    })
    .catch(error=>{
        console.log("Error accessing media device",error);
    })
    // var btnSendMsg=document.querySelector('#btn-send-msg');
    // var messageList=document.querySelector('#messages-list');
    // var messageInput=document.querySelector('msg');

    // btnSendMsg.addEventListener('click',sendMsgOnClick);

    // function sendMsgOnClick()
    // {
    //     var message=messageInput.value;
    //     var li=document.createElement('li');
    //     li.appendChild(document.createTextNode('Me: '+message));
    //     messageList.appendChild(li);
    //     var dataChannels=getDataChannels();

    //     message=username+': '+message;
    //     for(index in getDataChannels)
    //     {
    //         dataChannels[index].send(message);
    //     }
    //     messageInput.value='';
    // }

// sendSignal function----------------------------------------------------------------------->

    function sendSignal(action, message){
        var jsonStr=JSON.stringify({
            'peer':username,
            'action':action,
            'message':message
        });
        webSocket.send(jsonStr);
    }

// createOfferer------------------------------------------------------------------------------->

    function createOfferer(peerUsername,receiver_channel_name){
        var peer=new RTCPeerConnection(null);

        addLocalTracks(peer);
        var dc=peer.createDataChannel('channel');
        dc.addEventListener('open',()=>{
            console.log('Connection Opened!!!')
        });
        dc.addEventListener('message',dcOnMessage);
        var remoteVideo=createVideo(peerUsername);
        setOnTrack(peer,remoteVideo);
        mapPeers[peerUsername]=[peer,dc];

        peer.addEventListener('iceconnectionstatechange',()=>{
            var iceConnectionState=peer.iceConnectionState;
            if(iceConnectionState==='failed' || iceConnectionState==='disconnected'|| iceConnectionState==='closed'){

                delete mapPeers[peerUsername];
            
                if(iceConnectionState!='closed')    
                    peer.close();
                
                removeVideo(remoteVideo);

            }
        });

    peer.addEventListener('icecandidate',(event)=>{
        if(event.candidate){
            console.log('New ice candidate: ',JSON.stringify(peer.localDescription));

            return ;
        }
        sendSignal('new-offer',{
            'sdp':peer.localDescription,
            'receiver_channel_name':receiver_channel_name
        });
    });

    peer.createOffer()
        .then(o=>peer.setLocalDescription(o))
        .then(()=>{
            console.log('Local Description set successfully!!!');
        });
    }

// function of createAnswerer-------------------------------------------------------------------->

    function createAnswerer(offer,peerUsername,receiver_channel_name){
        var peer=new RTCPeerConnection(null);
        addLocalTracks(peer);
        var remoteVideo=createVideo(peerUsername);
        setOnTrack(peer,remoteVideo);
        peer.addEventListener('datachannel',e=>{
            peer.dc=e.channel
            peer.dc.addEventListener('open',()=>{
                console.log('Connection Opened!!!')
            });
            peer.dc.addEventListener('message',dcOnMessage);
            mapPeers[peerUsername]=[peer,peer.dc];
        })
        peer.addEventListener('iceconnectionstatechange',()=>{
            var iceConnectionState=peer.iceConnectionState;
            if(iceConnectionState==='failed' || iceConnectionState==='disconnected'|| iceConnectionState==='closed'){

                delete mapPeers[peerUsername];
            
                if(iceConnectionState!='closed')    
                    peer.close();
                
                removeVideo(remoteVideo);

            }
        });
        peer.addEventListener('icecandidate',(event)=>{
        if(event.candidate){
            console.log('New ice candidate: ',JSON.stringify(peer.localDescription));

            return ;
        }
        sendSignal('new-answer',{
            'sdp':peer.localDescription,
            'receiver_channel_name':receiver_channel_name
        });
        });
        peer.setRemoteDescription(offer)
        .then(()=>{
            console.log('Remote description set successfully for %s .',peerUsername);
            peer,createAnswerer();
        })
        .then(a=>{
            console.log('Answer Created.');

            return peer.setLocalDescription(a);
        })
    }
    
// function of addLocalTracks-------------------------------------------------------------------> 
    

    function addLocalTracks(peer){
        localStream.getTracks().forEach(track=>{
            peer.addTrack(track,localStream);
        });
        return ;
    }
    var messageList=document.querySelector('#messages-list')

// function of dcOnMessage-------------------------------------------------------------------------->

    function dcOnMessage(event){
        var message=event.data
        var li=document.createElement('li');
        li.appendChild(document.createTextNode(message));
        messageList.appendChild(li);
    }

//function of createVideo---------------------------------------------------------------------------->

    function createVideo(peerUsername){
        var videoContainer=document.querySelector('.video-container')
        var remoteVideo=document.createElement('video');
        remoteVideo.id=peerUsername+'-video';
        remoteVideo.autoplay=true;
        remoteVideo.playsInline=true;

        var videoWrapper=document.createElement('div');
        videoContainer.appendChild(videoWrapper);
        videoWrapper.appendChild(remoteVideo);
    
        return remoteVideo;
    }

// function of setOnTrack------------------------------------------------------------------------------->

    function setOnTrack(peer,remoteVideo){
        var remoteStream=new MediaStream();
        remoteVideo.srcObject=remoteStream;
        peer.addEventListener('track',async(event)=>{
            remoteStream.addTrack(event.track,remoteStream);
        });

    }

// function of remoteVideo--------------------------------------------------------------------------------->

    function removeVideo(video){
        var videoWrapper=video.parentNode;
        videoWrapper.parentNode.removeChild(videoWrapper);
    }


    function getDataChannels(){
        var dataChannels=[];
        for(peerUsername in mapPeers){
            var dataChannel=mapPeers[peerUsername][1];
            dataChannels.push(dataChannel);
        }
        return dataChannels;
    }