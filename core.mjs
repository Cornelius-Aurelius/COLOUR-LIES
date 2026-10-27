/** COLOUR LIES — Signal Override. Original game by Cornelius Aurelius. No external packages. */
export const CAMPAIGN_LENGTH=30;
export const COLOURS=[
 {id:'RED',hex:'#ff607e'},{id:'BLUE',hex:'#63a9ff'},{id:'GREEN',hex:'#62eeb2'},
 {id:'YELLOW',hex:'#ffe579'},{id:'PURPLE',hex:'#bb96ff'},{id:'ORANGE',hex:'#ffb36e'},
 {id:'PINK',hex:'#ff89c2'},{id:'CYAN',hex:'#60e7ee'}
];
export const SHAPES=[{id:'CIRCLE',glyph:'●'},{id:'TRIANGLE',glyph:'▲'},{id:'DIAMOND',glyph:'◆'},{id:'STAR',glyph:'★'}];
export const MODES=['campaign','endless','practice'];
export function mulberry32(seed){return function(){let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296}}
export function shuffle(array,rng=Math.random){const items=[...array];for(let i=items.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
export function stageConfig(stage,mode='campaign'){
 if(!Number.isInteger(stage)||stage<1||!MODES.includes(mode))throw new Error('Invalid stage or mode');
 const chapter=Math.min(5,Math.ceil(stage/6));
 return {chapter,stage,answerCount:stage<7?2:stage<19?3:4,seconds:mode==='practice'?null:Math.max(5.6,8.7-Math.min(stage,36)*.087),channel:stage<13?'word':(stage%3===0?'shape':'word'),chapterName:['First Signal','Colour Conflict','Pattern Interrupt','Signal Switch','The Override'][chapter-1]};
}
export function buildQuestion(stage,{mode='campaign',seed=0}={}){
 const cfg=stageConfig(stage,mode);
 const rng=mulberry32((Math.imul(stage,1928371)^Math.imul(seed+1,9301777))>>>0);
 const palette=COLOURS.slice(0,stage<7?4:stage<13?6:8);
 const word=palette[Math.floor(rng()*palette.length)];
 const otherColours=palette.filter(p=>p.id!==word.id);
 const ink=otherColours[Math.floor(rng()*otherColours.length)];
 const shape=SHAPES[Math.floor(rng()*SHAPES.length)];
 const options=cfg.channel==='shape'
  ?shuffle([shape,...shuffle(SHAPES.filter(x=>x.id!==shape.id),rng).slice(0,cfg.answerCount-1)],rng)
  :shuffle([word,...shuffle(otherColours,rng).slice(0,cfg.answerCount-1)],rng);
 const q={id:`${mode}-${stage}-${seed}`,stage,mode,channel:cfg.channel,word:word.id,ink:ink.hex,inkName:ink.id,shape:shape.id,options:options.map(x=>x.id),answer:cfg.channel==='shape'?shape.id:word.id,seconds:cfg.seconds,chapter:cfg.chapter,chapterName:cfg.chapterName};
 if(q.options.length!==cfg.answerCount||new Set(q.options).size!==q.options.length||!q.options.includes(q.answer)||q.word===q.inkName)throw new Error('Invalid generated question');
 return q;
}
export function initialGame(mode='campaign',startStage=1){if(!MODES.includes(mode)||!Number.isInteger(startStage)||startStage<1||mode==='campaign'&&startStage>CAMPAIGN_LENGTH)throw new Error('Invalid start');return {mode,stage:startStage,score:0,streak:0,lives:mode==='practice'?Infinity:3,correct:0,mistakes:0,hintsUsed:0,focusUsed:false,phase:'question',elapsed:0,completed:false};}
export function grade(state){if(state.mode!=='campaign'||!state.completed)return null;return state.mistakes===0&&state.hintsUsed===0?'GOLD':state.mistakes<=2?'SILVER':'BRONZE'}
export function focus(state,q){if(state.phase!=='question'||state.focusUsed&&state.mode!=='practice')return {state,disabled:[]};const disabled=q.options.filter(x=>x!==q.answer).slice(0,Math.max(1,q.options.length-2));return {state:{...state,score:Math.max(0,state.score-25),focusUsed:true,hintsUsed:state.hintsUsed+1},disabled};}
export function resolve(state,q,choice,{remaining=0}={}){
 if(state.phase!=='question'||q.stage!==state.stage||q.mode!==state.mode)throw new Error('Not an active question');
 const correct=choice===q.answer;
 if(choice!=='TIMEOUT'&&!q.options.includes(choice))throw new Error('Invalid choice');
 const streak=correct?state.streak+1:0;
 const earned=correct?(100+Math.min(60,Math.max(0,Math.floor(remaining))*8)+Math.min(80,Math.max(0,state.streak)*10)):0;
 const lives=correct?state.lives:(state.mode==='practice'?Infinity:Math.max(0,state.lives-1));
 return {...state,streak,score:state.score+earned,correct:state.correct+(correct?1:0),mistakes:state.mistakes+(correct?0:1),lives,phase:lives===0?'over':'feedback',last:{correct,choice,answer:q.answer,earned}};
}
export function advance(state){if(state.phase!=='feedback')throw new Error('Cannot advance');if(state.mode==='campaign'&&state.stage===CAMPAIGN_LENGTH)return {...state,phase:'complete',completed:true};return {...state,stage:state.stage+1,phase:'question',focusUsed:false,last:null};}
export function recordProgress(saved,state){const v=saved&&typeof saved==='object'?saved:{};const best={campaign:0,endless:0};for(const mode of ['campaign','endless'])best[mode]=Math.max(0,Number(v.best?.[mode])||0);if(state.mode!=='practice')best[state.mode]=Math.max(best[state.mode],state.score);return {best,unlocked:Math.min(CAMPAIGN_LENGTH,Math.max(1,Number(v.unlocked)||1,state.mode==='campaign'?Math.min(CAMPAIGN_LENGTH,state.stage+(state.phase==='feedback'&&state.last?.correct?1:0)):1)),completed:!!v.completed||state.completed,medal:state.completed?grade(state):v.medal||null};}