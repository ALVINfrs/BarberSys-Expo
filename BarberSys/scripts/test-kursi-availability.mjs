import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
function getOccupiedKursi(list){const s=new Set();for(const q of list){if(q.kursi_nomor!=null&&(q.status==='dipanggil'||q.status==='dilayani'))s.add(q.kursi_nomor)}return s}
function getAvailableKursi(n,occ){const o=[];for(let i=1;i<=n;i++)if(!occ.has(i))o.push(i);return o}
function formatKursi(n){if(n==null)return null;return `Kursi ${n}`}
describe('kursi-availability',()=>{
  it('occupied only dipanggil/dilayani',()=>{
    const occ=getOccupiedKursi([{kursi_nomor:1,status:'dipanggil'},{kursi_nomor:2,status:'selesai'},{kursi_nomor:3,status:'dilayani'},{kursi_nomor:null,status:'dipanggil'}]);
    assert.deepEqual([...occ].sort((a,b)=>a-b),[1,3]);
  });
  it('available filters occupied',()=>{
    assert.deepEqual(getAvailableKursi(4,new Set([1,3])),[2,4]);
  });
  it('formatKursi',()=>{
    assert.equal(formatKursi(2),'Kursi 2');
    assert.equal(formatKursi(null),null);
  });
});
