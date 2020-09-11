const { remote } = require('electron');
const { BrowserWindow } = remote;
const { dialog } = remote;
const path = require('path'); 
var fs = require('fs');
var mm = require('musicmetadata');
var randomColor = require('randomcolor');
var $ = require('jquery');
var color = [];


Number.prototype.clamp = function(min, max) {
  return Math.min(Math.max(this, min), max);
};

var importButton = document.getElementById('import'); 
let now_playing = document.querySelector(".now-playing"); 
let track_art = document.querySelector(".track-art"); 
let track_name = document.querySelector(".track-name"); 
let track_artist = document.querySelector(".track-artist"); 

let playpause_btn = document.querySelector(".playpause-track"); 
let next_btn = document.querySelector(".next-track"); 
let prev_btn = document.querySelector(".prev-track"); 

let seek_slider = document.querySelector(".seek_slider"); 
let volume_slider = document.querySelector(".volume_slider"); 
let curr_time = document.querySelector(".current-time"); 
let total_duration = document.querySelector(".total-duration"); 

let track_index = 0; 
let isPlaying = false; 
let updateTimer; 

let curr_track = document.createElement('audio');
var audio = curr_track;
var context = new AudioContext();
var src = context.createMediaElementSource(audio);


let my_musics = []; 

loadMyMusic();
loadTrack(track_index)

function loadTrack(track_index) { 
    if(track_index > my_musics.length){
        return;
    }

    clearInterval(updateTimer); 
    resetValues(); 

    curr_track.src = my_musics[track_index].path; 
    curr_track.load(); 

    track_name.textContent = my_musics[track_index].name; 
    track_artist.textContent = my_musics[track_index].artist; 
    now_playing.textContent =  
        "MUSIK KE " + (track_index + 1) + " DARI " + my_musics.length; 

    updateTimer = setInterval(seekUpdate, 1000); 
    
    curr_track.addEventListener("ended", nextTrack); 

    random_bg_color(); 
} 

function random_bg_color() { 
    color = randomColor({format:'hslArray'});
    document.documentElement.style.setProperty('--hue', color[0]);
    document.documentElement.style.setProperty('--sat', color[1]);
    document.documentElement.style.setProperty('--light', color[2]);
} 

function resetValues() { 
    curr_time.textContent = "00:00"; 
    total_duration.textContent = "00:00"; 
    seek_slider.value = 0; 
} 

function playpauseTrack() { 
    if (!isPlaying) playTrack(); 
    else pauseTrack(); 
} 
    
function playTrack() { 
    curr_track.play(); 
    isPlaying = true; 
    var analyser = context.createAnalyser();
    var canvas = document.getElementById("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var ctx = canvas.getContext("2d");

    src.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 256;

    var bufferLength = analyser.frequencyBinCount;

    var dataArray = new Uint8Array(bufferLength);
    var WIDTH = canvas.width;
    var HEIGHT = canvas.height;

    var barWidth = (WIDTH / bufferLength) * 2.5;
    var barHeight;
    var x = 0;

    function renderFrame() {
        requestAnimationFrame(renderFrame);

        var center_x = canvas.width / 2;
        var center_y = canvas.height / 2;
        var radius = 100;
        ctx.beginPath();
        ctx.arc(center_x,center_y,radius,0,2*Math.PI);
        ctx.stroke();

        x = 0;

        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        for (var i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i];
            var h = barHeight + (color[0] * (i/bufferLength)).clamp(0,360);
            var s = (color[1] * (i/bufferLength)).clamp(0,100);
            var l = color[2];
            ctx.fillStyle = "hsl(" + h + "," + s + "%," + l + "%)";
            ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
            x += barWidth + 1;
            rads = Math.PI * 2 / bufferLength;

            var bar_height = barHeight.clamp(10,Math.max(...dataArray));
            var bar_width = 3;

            var x1 = center_x + Math.cos(rads * i) * (radius);
            var y1 = center_y + Math.sin(rads * i) * (radius);
            var x_end = center_x + Math.cos(rads * i)*(radius + bar_height);
            var y_end = center_y + Math.sin(rads * i)*(radius + bar_height);
           
            ctx.strokeStyle = "hsl(" + h + ", " + s + "%, " + l + "%)";
            ctx.lineWidth = bar_width;
            ctx.beginPath();
            ctx.moveTo(x1,y1);
            ctx.lineTo(x_end,y_end);
            ctx.stroke();
        }
        
    }

    audio.play();
    renderFrame();
    playpause_btn.innerHTML = '<i class="fa fa-pause-circle fa-5x"></i>'; 
} 


    
function pauseTrack() { 
    curr_track.pause(); 
    isPlaying = false; 
    playpause_btn.innerHTML = '<i class="fa fa-play-circle fa-5x"></i>';; 
} 
    
function nextTrack() { 
    if (track_index < my_musics.length - 1) 
    track_index += 1; 
    else track_index = 0; 
    loadTrack(track_index); 
    playTrack(); 
} 
    
function prevTrack() { 
    if (track_index > 0) 
    track_index -= 1; 
    else track_index = my_musics.length; 
    loadTrack(track_index); 
    playTrack(); 
} 

function seekTo() { 
    seekto = curr_track.duration * (seek_slider.value / 100); 
    curr_track.currentTime = seekto; 
} 
    


function setVolume(v) { 
    curr_track.volume = v; 
    if(volume_slider.value / 100 != v){
        volume_slider.value = v * 100;
    }
}

$(".volume_slider").on('change',function(){
    setVolume($(this).val() / 100)
})


    
function seekUpdate() { 
    let seekPosition = 0; 
    if (!isNaN(curr_track.duration)) { 
        seekPosition = curr_track.currentTime * (100 / curr_track.duration); 
        seek_slider.value = seekPosition; 
        let currentMinutes = Math.floor(curr_track.currentTime / 60); 
        let currentSeconds = Math.floor(curr_track.currentTime - currentMinutes * 60); 
        let durationMinutes = Math.floor(curr_track.duration / 60); 
        let durationSeconds = Math.floor(curr_track.duration - durationMinutes * 60); 
        if (currentSeconds < 10) { currentSeconds = "0" + currentSeconds; } 
        if (durationSeconds < 10) { durationSeconds = "0" + durationSeconds; } 
        if (currentMinutes < 10) { currentMinutes = "0" + currentMinutes; } 
        if (durationMinutes < 10) { durationMinutes = "0" + durationMinutes; } 

        curr_time.textContent = currentMinutes + ":" + currentSeconds; 
        total_duration.textContent = durationMinutes + ":" + durationSeconds; 
    } 
} 

global.filepath = undefined; 

importButton.addEventListener('click', () => {
    if (process.platform !== 'darwin') { 
        dialog.showOpenDialog({ 
            title: 'import musik yang akan di tambahkan', 
            defaultPath: path.join(__dirname), 
            buttonLabel: 'import',
            filters: [ 
                { 
                    name: 'Music', 
                    extensions: ['mp3', 'wav'] 
                }], 
            properties: ['openFile'] 
        }).then(file => {  
            console.log(file.canceled); 
            if (!file.canceled) { 
                global.filepath = file.filePaths[0].toString(); 
                var parser = mm(fs.createReadStream(global.filepath), function (err, metadata) {
                    if (err) {
                        alert(err);
                    }

                    var check = my_musics.filter(m => m.path == global.filepath);
                    if(check != null){
                        alert(`${check.name} sudah ada di playlist`)
                    }
                    if(metadata && check == null){
                        console.log(metadata);
                        my_musics.push({ 
                            name: (metadata.title != "")?metadata.title:path.basename(global.filepath), 
                            artist: metadata.artist[0] ?? "Artis Tidak Di Ketahui", 
                            path: global.filepath
                        })
                        saveMyMusic();
                    }
                });
            
            }   
        }).catch(err => { 
            console.log(err) 
        }); 
    } 
    else { 
        dialog.showOpenDialog({ 
            title: 'import musik yang akan di tambahkan', 
            defaultPath: path.join(__dirname), 
            buttonLabel: 'import', 
            filters: [ 
                { 
                    name: 'Music', 
                    extensions: ['mp3', 'wav'] 
                }], 
            properties: ['openFile', 'openDirectory'] 
        }).then(file => { 
            console.log(file.canceled); 
            if (!file.canceled) { 
                global.filepath = file.filePaths[0].toString(); 
                var parser = mm(fs.createReadStream(global.filepath), function (err, metadata) {
                    if (err) {
                        alert(err);
                    }

                    var check = my_musics.filter(m => m.path == global.filepath);
                    if(check != null){
                        alert(`${check.name} sudah ada di playlist`)
                    }
                    if(metadata && check == null){
                        console.log(metadata);
                        my_musics.push({ 
                            name: (metadata.title != "")?metadata.title:path.basename(global.filepath), 
                            artist: metadata.artist[0] ?? "Artis Tidak Di Ketahui", 
                            path: global.filepath
                        })
                        saveMyMusic();
                    }
                });
                
            }   
        }).catch(err => { 
            console.log(err) 
        }); 
    } 
});

function openNav() {
    document.getElementById("sidemenu-panel").classList.add("open");
}

function closeNav() {
    document.getElementById("sidemenu-panel").classList.remove("open");
}

function saveMyMusic(){
    localStorage.setItem('my_musics', JSON.stringify(my_musics));
    renderListMusics();
}

function loadMyMusic(){
    var retrievedObject = localStorage.getItem('my_musics');
    my_musics = JSON.parse(retrievedObject) ?? [];
    renderListMusics();
}

function renderListMusics() {
    var my = document.getElementById("myMusics");
    my.innerHTML = '';
    for (let index = 0; index < my_musics.length; index++) {
        const e = my_musics[index];
        var node = document.createElement("LI");
        var textnode = document.createTextNode(`${e.name} -  ${e.artist}`); 
        node.appendChild(textnode);
        

        var true_width = ( function(){
            var $tempobj = $(node)
                .clone().contents()
                .parent().appendTo('body')
                .css('left','-1000px');
            var result = $tempobj.width();
            $tempobj.remove();
            return result;
          })();

        $(node).attr("true-width",true_width);
        $(node).attr("data-path",e.path);

        my.appendChild(node)
        
    }

    now_playing.textContent =  
        "MUSIK KE " + (track_index + 1) + " DARI " + my_musics.length; 
}

$(document).on('mouseover',"#myMusics li", function(){
    var shift_distance = $(this).attr('true-width') - $(this).width();
    console.log(shift_distance)
    var time_normalized = parseInt(shift_distance / 100, 10) * 1000;
    $(this).finish().animate({
          "text-indent": -shift_distance,
          right: 0
    }, time_normalized, 'linear');
});


$(document).on('mouseout',"#myMusics li", function(){

    $(this).finish().animate({
        "text-indent": 0,
        right: 0
    }, 0);
});

$(document).on('click',"#myMusics li", function(){

    for (let index = 0; index < my_musics.length; index++) {
        const e = my_musics[index];
        if($(this).data('path') == e.path){
            track_index = index;
            break;
        } 
    
    }

    loadTrack(track_index); 
    playTrack();
});


    