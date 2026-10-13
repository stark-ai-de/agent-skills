#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {spawnSync} from "node:child_process";
// Synthetic, disposable code-review cases. No network/model calls.
const cases={
 "zero-is-present":{red:true,task:"Fix id=0 falsy handling; absent fields remain invalid.",
  files:{
   "src/api.mjs":"export function parse(v){if(!v||!v.id||!v.kind)return {ok:false};return {ok:true,id:v.id,kind:v.kind}}\n",
   "test/api.test.mjs":"import test from 'node:test';import assert from 'node:assert/strict';import {parse} from '../src/api.mjs';test('id 0',()=>assert.deepEqual(parse({id:0,kind:'card'}),{ok:true,id:0,kind:'card'}));test('missing id',()=>assert.equal(parse({kind:'card'}).ok,false));test('missing kind',()=>assert.equal(parse({id:1}).ok,false));\n"
 }},
 "duplicate-validators":{red:false,simplify:true,task:"Even with green tests, deduplicate repeated limit-check responsibility. Preserve both exports and semantics.",
  files:{
   "src/limits.mjs":"export function validQueue(x){return typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<=50;}\nexport function validBatch(x){return typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<=50;}\n",
   "test/limits.test.mjs":"import test from 'node:test';import assert from 'node:assert/strict';import {validQueue,validBatch} from '../src/limits.mjs';for(const f of [validQueue,validBatch])test(f.name,()=>{for(const x of [0,1,50])assert.equal(f(x),true);for(const x of [-1,51,1.5,'1',null])assert.equal(f(x),false)});\n"
 }},
 "distinct-contracts":{red:false,task:"Similar-looking contracts differ for zero. Preserve strictly-positive seat count and nonnegative adjustment. No change may be necessary.",
  files:{
   "src/policies.mjs":"export function seats(x){return Number.isInteger(x)&&x>0;}\nexport function adjustment(x){return Number.isInteger(x)&&x>=0;}\n",
   "test/policies.test.mjs":"import test from 'node:test';import assert from 'node:assert/strict';import {seats,adjustment} from '../src/policies.mjs';test('zero differs',()=>{assert.equal(seats(0),false);assert.equal(adjustment(0),true)});test('negative invalid',()=>{assert.equal(seats(-1),false);assert.equal(adjustment(-1),false)});\n"
 }},
 "untracked-component":{red:true,task:"The untracked src/chip.mjs is part of the feature; preserve empty string labels and nullish fallback.",
  files:{
   "src/index.mjs":"import {render} from './chip.mjs';export function chip(x){return render(x)}\n",
   "test/chip.test.mjs":"import test from 'node:test';import assert from 'node:assert/strict';import {chip} from '../src/index.mjs';test('empty label',()=>assert.equal(chip(''),''));test('null fallback',()=>assert.equal(chip(null),'unknown'));test('ordinary',()=>assert.equal(chip('OK'),'OK'));\n"
  },untracked:{"src/chip.mjs":"export function render(x){return String(x||'unknown')}\n"}},
 "regression-guard":{red:true,task:"Zero is normal. Preserve nullish missing, negatives invalid, 100+ high.",
  files:{
   "src/amount.mjs":"export function classify(x){if(x===null||x===undefined)return 'missing';if(x<0)return 'invalid';if(!x)return 'missing';if(x>=100)return 'high';return 'normal'}\n",
   "test/amount.test.mjs":"import test from 'node:test';import assert from 'node:assert/strict';import {classify} from '../src/amount.mjs';test('zero',()=>assert.equal(classify(0),'normal'));test('nullish',()=>assert.equal(classify(null),'missing'));test('negative',()=>assert.equal(classify(-1),'invalid'));test('threshold',()=>assert.equal(classify(100),'high'));\n"
 }}
};
function run(exe,args,cwd){const p=spawnSync(exe,args,{cwd,encoding:"utf8",timeout:15000});if(p.error)throw p.error;return p}
function arg(args,k){let i=args.indexOf("--"+k);return i<0?null:args[i+1]}
function write(dir,files){for(const [p,s]of Object.entries(files)){let d=path.join(dir,p);fs.mkdirSync(path.dirname(d),{recursive:true});fs.writeFileSync(d,s)}}
function prepare(id,d){const c=cases[id];if(!c)throw Error("Unknown case "+id);if(!d)throw Error("Missing --out");
 const dest=path.resolve(d);if(fs.existsSync(dest))throw Error("Existing destination refused "+dest);fs.mkdirSync(dest);
 write(dest,c.files);fs.writeFileSync(path.join(dest,"TASK.md"),"# Review task\n\n"+c.task+"\n\nRun node --test before reporting.\n");
 for(const a of [["init","-q","-b","main"],["add","TASK.md","src","test"],["-c","user.name=Fixture Author","-c","user.email=fixture@example.invalid","commit","-qm","Fixture baseline"]]){
  const r=run("git",a,dest);if(r.status!==0)throw Error(r.stderr)
 }
 write(dest,c.untracked||{});return {id,dir:dest,head:run("git",["rev-parse","HEAD"],dest).stdout.trim(),untracked:Object.keys(c.untracked||{})}
}
function grade(id,d){const c=cases[id];if(!c)throw Error("Unknown case");if(!d)throw Error("Missing --dir");
 const dest=path.resolve(d);if(!fs.existsSync(path.join(dest,".git")))throw Error("Not a fixture");
 const changed=Object.entries(c.files).filter(([p,s])=>p.startsWith("test/")&&(!fs.existsSync(path.join(dest,p))||fs.readFileSync(path.join(dest,p),"utf8")!==s)).map(([p])=>p);
 const start=performance.now(),r=run("node",["--test"],dest);
 let reduced=null;if(c.simplify)reduced=(fs.readFileSync(path.join(dest,"src/limits.mjs"),"utf8").match(/Number\.isInteger\s*\(/g)||[]).length<=1;
 return {id,passed:r.status===0&&!changed.length&&reduced!==false,testsPassed:r.status===0,originalTestsChanged:changed,simplified:reduced,elapsedMs:Math.round(performance.now()-start),testTail:(r.stdout+r.stderr).slice(-700),note:"Mechanical grader only; semantic and churn review remain required"};
}
const [op,...args]=process.argv.slice(2);
try{
 if(op==="list")console.log(JSON.stringify(Object.entries(cases).map(([id,v])=>({id,baseline:v.red?"RED":"GREEN",simplify:!!v.simplify,untracked:!!v.untracked})),null,2));
 else if(op==="prepare")console.log(JSON.stringify(prepare(arg(args,"case"),arg(args,"out")),null,2));
 else if(op==="grade"){let r=grade(arg(args,"case"),arg(args,"dir"));console.log(JSON.stringify(r,null,2));if(!r.passed)process.exitCode=1}
 else if(op==="selftest"){const t=fs.mkdtempSync(path.join(os.tmpdir(),"swarm-fixture-"));try{for(const [id,v]of Object.entries(cases)){const d=path.join(t,id);prepare(id,d);const r=grade(id,d);if(r.testsPassed===v.red)throw Error("Wrong baseline "+id);if(v.simplify&&r.simplified!==false)throw Error("Already simplified "+id);console.log(id+": baseline "+(r.testsPassed?"GREEN":"RED")+" as designed")}}finally{fs.rmSync(t,{recursive:true,force:true})}}
 else throw Error("Usage: list|selftest|prepare --case ID --out NEW_DIR|grade --case ID --dir DIR");
}catch(e){console.error(e.message);process.exitCode=2}
