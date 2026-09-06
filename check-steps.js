// 检查所有 run/free 步骤都有 good 字段 + pass 字段
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const core = js.split('/* ---------- 渲染：首页')[0];

global.document = {querySelectorAll:function(){return[]},querySelector:function(){return null},addEventListener:function(){},getElementById:function(){return null}};
global.localStorage = {getItem:function(){return null},setItem:function(){},removeItem:function(){}};
global.window = {};

const checks = `
;(function(){
  let missing = [];
  TUT.forEach(function(lv, li){
    lv.script.forEach(function(st, si){
      if(st.t==='run' || st.t==='free'){
        if(!st.good) missing.push('第'+(li+1)+'关 步骤'+(si+1)+' 缺good');
        if(!st.pass) missing.push('第'+(li+1)+'关 步骤'+(si+1)+' 缺pass');
      }
    });
  });
  console.log(missing.length ? '发现问题: ' + missing.join(' | ') : '全部 run/free 步骤 good/pass 完整 ✓');
})();
`;

eval(core + checks);
