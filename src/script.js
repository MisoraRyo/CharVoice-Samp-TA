/////////////////////////////////////////////////////////////////////////
///// IMPORT
import './style.css'
// Textalive関連
import Songs from './song.json';
import { Player } from "textalive-app-api";
// Three.js関連
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from "three/examples/jsm/libs/stats.module";
import GUI, { FunctionController } from 'lil-gui';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import Typeface from '../static/ZenOldMincho_Regular_min.json';
// Animation
import { gsap, mapRange } from "gsap";

// GUIの初期設定
const gui = new GUI({width:180});
gui.domElement.id = 'gui';
gui.close();

// Three.js でテキストを生成するために必要なフォントデータ
const fontLoader = new FontLoader();
const Ffont  = fontLoader.parse(Typeface);

window.onload = function(){

/////////////////////////////////////////////////////////////////////////
///// 
///// TextAlive-Api
///// 
///// 
/////////////////////////////////////////////////////////////////////////

//TextAlive_APi初期化
const player = new Player({
    // Interface PlayerOptions
    // https://developer.textalive.jp/packages/textalive-app-api/interfaces/PlayerOptions.html
    //
    app: { 
      token: "★★★★★★★★★★",//Token　★★★★★取得したトークンを追加ください！！！★★★★
      parameters: [
      ]
    },
    mediaElement: document.querySelector("#media"),
    vocalAmplitudeEnabled : true,/*歌声の声量*/
    valenceArousalEnabled : true,/*感情値*/

    //fontFamilies: ["kokoro"], // null <= すべてのフォントを読み込む
    //lyricsFetchTimeout:1000, //
    //throttleInterval:10, //アップデート関数の発行間隔をしていする。ミリセカンド。
    //mediaBannerPosition:"top", //音源メディアの情報を表示する位置を指定する。座標指定ではない。
});

//デバック時のみ[0~100]
player.volume = 10;

/////////////////////////////////////////

//テキストのグローバル変数
let nowChar = "";
let nowWord = "";
let nowPhrase = "";
//曲の長さ&終了処理をする
let endTime = 0;
let voiceEndTime = 0;
//最大声量
let MaxVocal = 0;
let SongVocal = 0; //0~1の値

//場面構成
let SEGMENTS=[];
let nowSegment = 0;//曲のいまのセグメントを管理するグローバル変数

// リスナの登録 / Register listeners
player.addListener({

    onAppReady: (app) => {
      if (!app.managed) {
        player.createFromSongUrl( Songs[0].url, Songs[0].data);
  
        // 
        // 生きること / nogumi feat. 初音ミク
        // player.createFromSongUrl("https://piapro.jp/t/fnhJ/20230131212038", {
        //    video: {
        //     // 音楽地図訂正履歴: https://songle.jp/songs/2245018/history
        //     beatId: 4267300,
        //     chordId: 2405033,
        //     repetitiveSegmentId: 2475606,
        //     // 歌詞タイミング訂正履歴: https://textalive.jp/lyrics/piapro.jp%2Ft%2FQtjE%2F20220207164031
        //     lyricId: 56131,
        //     lyricDiffId: 9638
        //    },
        // });
        //
  
      } else {
        console.log("No app.managed"); 
      }

      if (!app.managed) {
      }
    },

    onAppMediaChange: (mediaUrl) => {
      console.log("新しい再生楽曲が指定されました:", mediaUrl);
    },

    onVolumeUpdate: (e)=>{
      console.log("Volume", e);
    },
  
    onFontsLoad: (e) =>{/* フォントが読み込めたら呼ばれる */
      console.log("font", e);
    },
  
    onTextLoad: (body) => {/* 楽曲のテキスト情報が取得されたら */
      console.log("onTextLoad",body);
    },
  
    onVideoReady: (video)=> {/* 楽曲情報が取れたら呼ばれる */

      if (!player.app.managed) {
        //document.querySelector("#message").className = "active";

        //ビート・コード進行・繰り返し区間（サビ候補）・ビート、コード進行、繰り返し区間のリビジョンID（バージョン番号）
        //セグメント_繰り返し区間（サビ候補）
        let Segments = player.data.songMap.segments;
        let NosortSegments =[];
        for(let i=0; i<Segments.length; i++){
          if(Segments[i].chorus){
              Array.from(Segments[i].segments, (z)=>{
                z.chorus = true;
                z.section = i;
                NosortSegments.push(z);
              })
          }else{
              Array.from(Segments[i].segments, (z)=>{
                z.chorus = false;
                z.section = i;
                NosortSegments.push(z);
              })
          }
        }
        //時間に降順にして配列情報を渡す オブジェクトの昇順ソート
        SEGMENTS = NosortSegments.sort(function(a, b) {return (a.startTime < b.startTime) ? -1 : 1;});
        console.log("サビの区間情報：",SEGMENTS);
        MaxVocal = player.getMaxVocalAmplitude();
        console.log("最大声量：" + MaxVocal)
        //終了処理のために取得するグローバル変数
        voiceEndTime = player.video.data.endTime;
        endTime = player.video.data.duration;
        console.log("終了時間 VoiceEndTime:" + voiceEndTime);
        console.log("終了時間 duration:" + endTime);
        console.log("FPS:" + player.fps);

      }//END if (!player.app.managed)
  
    },
  
    onTimerReady() {/* 再生コントロールができるようになったら呼ばれる */
      //loadingのテキストの書き換え
      console.log("再生準備ができました");
      
      //再生ボタンのスイッチング
      document.getElementById("Play-Btn").addEventListener("click", () => function(p){  
        if (p.isPlaying){ 
            //再生中
        }else{
            //再生してない
            p.requestPlay();
        }
      }(player));

      //停止ボタンのスイッチング
      document.getElementById("Stop-Btn").addEventListener("click", () => function(p){ 
        if (p.isPlaying){
          //再生中なら
            p.requestStop();
        }else{ 
          //再生してない   
        }
      }(player));

    },
  
    onPlay: () => {/* 再生時に呼ばれる */
      console.log("player.onPlay");
    },
  
    onPause: () => {
      console.log("player.onPause");
      //★初期起動時にpostion値が入るバグ回避
      player.requestStop();//onStopを呼ぶ 
    },
  
    onSeek: () => {
      console.log("player.onSeek");
    },
  
    onStop: () => {
      console.log("player.onStop");
      
      //初期化
      nowChar = "";
      nowWord = "";
      nowPhrase = "";
    },
  
    //再生時に回転する 再生位置の情報が更新されたら呼ばれる */
    // onTimeUpdate: (position) =>{
    //   console.log(position);

    //   /* 歌詞＆フレーズ　*/
    //   let Char = player.video.findChar(position - 100, { loose: true });
    //   let Word = player.video.findWord( position - 100, { loose: true });
    //   let Phrase = player.video.findPhrase( position - 100, { loose: true });
      
    //   //文字を取得する
    //   if(nowChar != Char.text){
    //         nowChar = Char.text;
    //         console.log(nowChar);
    //   }//End if(char)

    //   //単語を取得する
    //   if(Word){
    //     if(nowWord != Word.text){
    //         nowWord = Word.text;
    //         console.log(nowWord);
    //     }
    //   }//End if(Word)
      
    //   //フレーズを取得する
    //   if(Phrase) {
    //     if(nowPhrase != Phrase.text){
    //         nowPhrase = Phrase.text
    //         console.log(nowPhrase);
    //     }
    //   }//End if(phrase)
      
    //   //ボーカルの声量を取得する
    //   SongVocal = player.getVocalAmplitude(position)/ MaxVocal;
    //   console.log(SongVocal);

    //   //声量を100%で表示する
    //   //positionbarElement.style.width = Math.floor( position ) / endTime * 100 + "%";
    // }// End onTimeUpdate
  

});//END player.addListener
  
//
// 曲を別のものに変更する
//

function valueChange(){
  // イベントが発生した時の処理
  let num = document.getElementById("select").value;
  player.createFromSongUrl( Songs[num].url, Songs[num].data,);
  //
  //document.getElementById("Play-Btn").classList.remove('is-active');
  //document.getElementById("Stop-Btn").classList.remove('is-active');
  console.log("Select_Change");
}

// 選択式のメニューで変更があったら、新しい曲に変更される
let element = document.getElementById('select');
element.addEventListener('change', valueChange);


/////////////////////////////////////////////////////////////////////////
///// 
///// MY FUNCTION
///// 
///// 
/////////////////////////////////////////////////////////////////////////

// Random の値
function getRandomNum(min = 0, max = 0){
  return Math.floor( Math.random() * (max - min + 1)) + min;
}

// easing
function easeInOutSine(x) {
  return -(Math.cos(Math.PI * x) - 1) / 2;
}
/////////////////////////////////////////////////////////////////////////
///// 
///// THREE.JS
///// 
///// 
/////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////
///// SCENE CREATION

const scene = new THREE.Scene()
scene.background = new THREE.Color('#eee');

/////////////////////////////////////////////////////////////////////////
///// RENDERER CONFIG

let PixelRation = 1; //PixelRatio
PixelRation = Math.min(window.devicePixelRatio, 2.0);
console.log("window.devicePixelRatio & 計算値 =>",window.devicePixelRatio, PixelRation);

const renderer = new THREE.WebGLRenderer({
  canvas:document.getElementById("MyCanvas"),
  alpha:true,
  antialias: true,
});
renderer.setPixelRatio(PixelRation) //Set PixelRatio
renderer.setSize(window.innerWidth, window.innerHeight) // Make it FullScreen

/////////////////////////////////////////////////////////////////////////
// STATS SET

const stats = new Stats();
stats
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);
Object.assign(stats.dom.style, {'position': 'fixed','height': 'max-content',
  'left': 'auto','right': '0',
  'top': 'auto','bottom': '0'
});

/////////////////////////////////////////////////////////////////////////
///// CAMERAS CONFIG

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 1000)
camera.position.set(0.0, 0.0, 180.0);
scene.add(camera)

/////////////////////////////////////////////////////////////////////////
///// CREATE ORBIT CONTROLS

const controls = new OrbitControls(camera, renderer.domElement)

/////////////////////////////////////////////////////////////////////////
///// CREATE HELPER

const size = 140;
const divisions = 40;

const gridHelperA = new THREE.GridHelper( size, divisions, "#cccccc", "#cccccc" );
gridHelperA.position.set(0.0, 10.0, 0);
gridHelperA.rotation.x = Math.PI/2
gridHelperA.visible = false;
scene.add( gridHelperA );

const axesHelper = new THREE.AxesHelper(10);
axesHelper.visible = false;
scene.add(axesHelper);

/////////////////////////////////////////////////////////////////////////
///// Plane character

const texture = new THREE.TextureLoader().load("miku4.png");
texture.colorSpace = THREE.SRGBColorSpace; 

const geometry = new THREE.PlaneGeometry( 144, 228.6 );
const material = new THREE.MeshBasicMaterial( {
  color: 0xffffff,
  map: texture,
  side: THREE.DoubleSide,
  transparent:true,
} );
const plane = new THREE.Mesh( geometry, material );
plane.position.set(4,-70,-1);
scene.add( plane );

/////////////////////////////////////////////////////////////////////////
///// OBJECT

//
// テキスト_ラインアニメーション
//
const TextAnimeMoveGroup = new THREE.Group();

// 文字を表示する
function DisplayPhrase(string, wordcount, starttime, endtime, PhraseData){

  const String = string;
  const StringNum = wordcount;
  const StartTime = starttime;
  const EndTime = endtime;

  let radius = getRandomNum(0, 40);

  //動詞・名詞
  // if( PhraseData._data.pos == "V" || PhraseData._data.pos == "N" ){
  //   radius =  getRandomNum(1, 50)
  // }else{

  // }

  //
  // テキストの形成
  //
  const TEXT = String;
  const shapes = Ffont.generateShapes( TEXT, 6 );//文字サイズ
  const TextGeometry = new THREE.ShapeGeometry( shapes, 4 );
  TextGeometry.computeBoundingBox();
  TextGeometry.center();//Center the geometry based on the bounding box.

  const TextMaterial = new THREE.MeshBasicMaterial({
    color: 0x222222,
    side: THREE.DoubleSide,
    transparent:true,
    opacity: 1.0,
    //wireframe: true,
  });
  const Geotext = new THREE.Mesh( TextGeometry, TextMaterial );

  //
  Geotext.SpeedZ = Math.random(); 

  //
  TextAnimeMoveGroup.add(Geotext);
  scene.add(TextAnimeMoveGroup);

  //
  const EndY = getRandomNum(80,120);
  const posY1 = Vec3RandPos(radius, 20);
  const posY2 = Vec3RandPos(radius*1.6, EndY);

  // Animation用のベジェ曲線を作成して
  const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3( 0, 0, 0 ),
      posY1,
      posY2
  );  

  const GsapTime = 1.8 + Math.random()*0.3; // 1.8+0.3でアニメーションを表示させる
  Geotext.scale.set(0,0,0);

  gsap.to(Geotext, GsapTime,{
    ease: "Power1.easeIn",
    //delay: 0,
    onStart: function(){},
    onUpdate: function(){
      // postion
      const point = curve.getPointAt(easeInOutSine(this.progress())%1);
      Geotext.position.copy(point);
      // scale
      const scaleset = THREE.MathUtils.smoothstep(easeInOutSine(this.progress()), 0, 0.24);
      Geotext.scale.set(scaleset,scaleset,scaleset);
      // opacity
      Geotext.material.opacity = 1.0 - THREE.MathUtils.smoothstep(this.progress(), 0.7, 1.0 );
      
      // カメラ方向に向ける
      const camPos = camera.position;
      Geotext.lookAt(camPos);
    },
    onComplete:function(){
      Geotext.geometry.dispose();
      //object.material.map.dispose();
      Geotext.material.dispose();
      //curve.dispose();
      TextAnimeMoveGroup.remove(Geotext);
    },
  });


}// end DisplayPhrase

function Vec3RandPos(RADIUE = 0, YY = 0){

  const radius = RADIUE;
  const y = YY;
  
  const vvec3 = new THREE.Vector3();
  const theta = THREE.MathUtils.degToRad(Math.random()*360);
  const phi = THREE.MathUtils.degToRad(Math.random()*360);
  vvec3.x = Math.sin(theta) * Math.cos(phi) * radius;
  vvec3.y = y;
  vvec3.z = Math.sin(theta) * Math.sin(phi) * radius;

  return vvec3;
}
/////////////////////////////////////////////////////////////////////////
//// RENDER LOOP FUNCTION
const clock = new THREE.Clock();
const positionbarElement = document.getElementById("nav-bar");

function renderLoop() {
    stats.begin();//STATS計測

    const delta = clock.getDelta();//animation programs
    const elapsedTime = clock.getElapsedTime();
    //controls.update() // update orbit control

    ////////////////////////////////////////
    // TextAlive 
    if(player.isPlaying){
      const position = player.timer.position;
      //let Char = player.video.findChar(position - 100, { loose: true });
      let Word = player.video.findWord( position - 100, { loose: true });

      if(Word) {
        if(nowPhrase != Word.text){

          nowPhrase = Word.text;
          const StartTime = Word.startTime - position - 100;
          //
          setTimeout(() => {
            DisplayPhrase(nowPhrase, nowPhrase.length, Word.startTime, Word.endTime, Word);

          }, StartTime);
        }
      }

      //再生バーの更新
      positionbarElement.style.width = Math.floor( position ) / endTime * 100 + "%"; 
    }

    // End TextAlive
    ////////////////////////////////////////
    renderer.render(scene, camera) // render the scene using the camera
    requestAnimationFrame(renderLoop) //loop the render function
    
    stats.end();//stats計測
}

renderLoop() //start rendering

/////////////////////////////////////////////////////////////////////////
///// MAKE EXPERIENCE FULL SCREEN

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    //
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0)) //set pixel ratio
    renderer.setSize(window.innerWidth, window.innerHeight) // make it full screen  
})

/////////////////////////////////////////////////////////////////////////
///// STATS SETTING

const params = {						  
  myVisibleBoolean1: false,
  myVisibleBoolean2: false,
  valueA: 0.0, //
  valueB: 0.0, //
};
	
gui.add( params, 'myVisibleBoolean1').name('helper').listen()
.listen().onChange( function( value ) { 
  if( value == true ){
    gridHelperA.visible = value;
    axesHelper.visible = value;
  }else{
    gridHelperA.visible = value;
    axesHelper.visible = value;
  }
});


}//End Windows.onload
