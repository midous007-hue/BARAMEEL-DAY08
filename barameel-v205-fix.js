/* BARAMEEL V20.5/20.6 — scan/collection bridge
   Must load AFTER app.js on screen05 and screen06.
*/
(() => {
  const originalScan = window.BR?.scanUniversal;
  if (!originalScan || window.BR.__v205Patch) return;
  function normalize(result){
    const candidates=[result?.reward,result?.data?.reward,result?.reward_result,result?.data,result];
    for(const raw of candidates){
      if(!raw||typeof raw!=='object') continue;
      const collection_id=raw.collection_id??raw.collection??raw.collectionId;
      const image_id=raw.image_id??raw.image??raw.imageId;
      const piece_number=Number(raw.piece_number??raw.piece??raw.pieceNumber);
      if(collection_id&&image_id&&Number.isFinite(piece_number)&&piece_number>0){
        return {...raw,collection_id:String(collection_id),image_id:String(image_id),piece_number,
          points:Number(raw.points??raw.points_awarded??result?.points_awarded??result?.points??0)};
      }
    }
    return null;
  }
  window.BR.scanUniversal=async(args)=>{
    const result=await originalScan(args);
    const reward=normalize(result);
    if(reward){
      const current=window.BR.state||{}, collected={...(current.collected||{})};
      const c=reward.collection_id,i=reward.image_id,p=reward.piece_number;
      collected[c]={...(collected[c]||{})};
      collected[c][i]=Array.from(new Set([...(collected[c][i]||[]).map(Number),p])).filter(Number.isFinite).sort((a,b)=>a-b);
      window.BR.mergePlayer({collected,lastReward:reward});
      return {...result,reward,collection_id:c,image_id:i,piece_number:p};
    }
    return result;
  };
  window.BR.__v205Patch=true;
  window.BR.normalizeReward=normalize;
})();
