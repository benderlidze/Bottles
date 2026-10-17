'use strict';
const drypagePromo=$('drypagePromo'),drypageShown=new Set();let drypageGiantMilestone=0;
function showDrypagePromo(round){if(drypageShown.has(round))return;drypageShown.add(round);drypagePromo.classList.add('show');drypagePromo.setAttribute('aria-hidden','false');}
function hideDrypagePromo(){drypagePromo.classList.remove('show');drypagePromo.setAttribute('aria-hidden','true');}
function drypageResetRound(){drypageShown.clear();drypageGiantMilestone=0;}
$('drypageContinue').addEventListener('click',hideDrypagePromo);
// Keep the game-mode implementation independent from the promotion layer.
const drypageOriginalRebuild=rebuild;rebuild=function(){drypageResetRound();hideDrypagePromo();return drypageOriginalRebuild();};
const drypageOriginalToss=updateToss;updateToss=function(){drypageOriginalToss();if(gameMode==='toss'&&tossOverShown)showDrypagePromo('toss');};
const drypageOriginalGiant=updateGiant;updateGiant=function(){drypageOriginalGiant();const milestone=Math.floor(giantSmashed/5);if(gameMode==='giant'&&milestone>drypageGiantMilestone){drypageGiantMilestone=milestone;showDrypagePromo(`giant-${milestone}`);}};

// Store links: set the Google Play address here once it differs from the shared smart link.
const DRYPAGE_LINKS={ios:'https://drypage.app/app',android:'https://drypage.app/app'};
document.querySelectorAll('[data-store]').forEach(a=>{a.href=DRYPAGE_LINKS[a.dataset.store];});
