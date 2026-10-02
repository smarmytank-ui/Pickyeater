import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

export async function verifySocialAssets({ projectRoot=root }={}){
  const manifestPath=path.join(projectRoot,'SOCIAL_ASSET_MANIFEST.json');
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  const errors=[];

  if(manifest.publicationAuthorized!==false){
    errors.push('publicationAuthorized must remain false until owner approval');
  }
  if(manifest.ownerAudioApproval!=='pending'){
    errors.push('ownerAudioApproval must remain pending until the owner listens');
  }
  if(!Array.isArray(manifest.assets)||manifest.assets.length!==3){
    errors.push('manifest must contain exactly three launch assets');
  }

  for(const asset of manifest.assets||[]){
    if(!/^[0-9]{2}-[a-z0-9-]+-voiced\.mp4$/.test(asset.file||'')){
      errors.push(`${asset.file||'<missing file>'}: only narrated -voiced.mp4 files are allowed`);
      continue;
    }
    const assetPath=path.join(projectRoot,manifest.assetRoot||'',asset.file);
    let bytes;
    let contents;
    try{
      [bytes,contents]=await Promise.all([stat(assetPath),readFile(assetPath)]);
    }catch{
      errors.push(`${asset.file}: file is missing`);
      continue;
    }
    if(bytes.size!==asset.bytes){
      errors.push(`${asset.file}: expected ${asset.bytes} bytes, found ${bytes.size}`);
    }
    const hash=createHash('sha256').update(contents).digest('hex').toUpperCase();
    if(hash!==String(asset.sha256||'').toUpperCase()){
      errors.push(`${asset.file}: SHA-256 mismatch`);
    }
    if(asset.status!=='awaiting_owner_audio_approval'){
      errors.push(`${asset.file}: status must remain awaiting_owner_audio_approval`);
    }
  }

  if(errors.length) throw new Error(`Social asset verification failed:\n- ${errors.join('\n- ')}`);
  return { count:manifest.assets.length, publicationAuthorized:false };
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  verifySocialAssets()
    .then(({count})=>console.log(`Verified ${count} narrated social assets; publication remains disabled.`))
    .catch(error=>{
      console.error(error.message);
      process.exitCode=1;
    });
}
