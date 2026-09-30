$ErrorActionPreference='Stop'
$ffmpeg='C:\Users\info\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Shared_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build-shared\bin\ffmpeg.exe'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$out=Join-Path $root 'output\video'
$assets=Join-Path $out 'assets'
New-Item -ItemType Directory -Force -Path $out,$assets | Out-Null

$videos=@(
  @{file='01-four-safe-foods.mp4'; image='campaign-four-foods-v1.png'; hook='FOUR FAMILIAR FOODS.'; hook2='ONE REALISTIC DINNER.'; mid='Start with what already works.'; sub='Food My Way turns familiar foods into a flexible recipe.'},
  @{file='02-tacos-without-tomatoes.mp4'; image='campaign-taco-swap-v1.png'; hook='HATE TOMATOES?'; hook2='THE TACOS CAN STAY.'; mid='Swap one ingredient. Keep the meal.'; sub='The whole recipe does not have to disappear.'},
  @{file='03-picky-adults.mp4'; image='campaign-picky-adult-v1.png'; hook='PICKY EATING DOES NOT'; hook2='MAGICALLY END AT 18.'; mid='Private. Flexible. No judgment.'; sub='Build meals around foods you actually like.'}
)

foreach($video in $videos){
  $filter=Join-Path $assets ($video.file+'.filter.txt')
  $graph=@"
[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.00035,1.045)':d=600:s=1080x1920:fps=30,format=yuv420p[bg];
[1:v]scale=760:-2,pad=784:1360:12:12:color=white[app];
[2:v]scale=760:-2,pad=784:1360:12:12:color=white[kit];
[bg][app]overlay=(W-w)/2:410:enable='between(t,4,11)'[v1];
[v1][kit]overlay=(W-w)/2:410:enable='between(t,11,17)'[v2];
[v2]drawbox=x=0:y=0:w=1080:h=410:color=0x17352e@0.88:t=fill:enable='between(t,0,4)',
drawtext=fontfile='C\:/Windows/Fonts/arialbd.ttf':text='$($video.hook)':fontcolor=white:fontsize=74:x=(w-text_w)/2:y=112:enable='between(t,0,4)',
drawtext=fontfile='C\:/Windows/Fonts/arialbd.ttf':text='$($video.hook2)':fontcolor=0xf6b544:fontsize=74:x=(w-text_w)/2:y=205:enable='between(t,0,4)',
drawbox=x=56:y=65:w=968:h=240:color=white@0.94:t=fill:enable='between(t,4,11)',
drawtext=fontfile='C\:/Windows/Fonts/arialbd.ttf':text='$($video.mid)':fontcolor=0x17352e:fontsize=54:x=(w-text_w)/2:y=105:enable='between(t,4,11)',
drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='$($video.sub)':fontcolor=0x5f746d:fontsize=31:x=(w-text_w)/2:y=190:enable='between(t,4,11)',
drawbox=x=56:y=65:w=968:h=240:color=white@0.94:t=fill:enable='between(t,11,17)',
drawtext=fontfile='C\:/Windows/Fonts/arialbd.ttf':text='14 DAYS. SIMPLE SWAPS. LESS GUESSING.':fontcolor=0x17352e:fontsize=43:x=(w-text_w)/2:y=112:enable='between(t,11,17)',
drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='The Picky Eater Survival Kit - $19':fontcolor=0x27765f:fontsize=38:x=(w-text_w)/2:y=190:enable='between(t,11,17)',
drawbox=x=0:y=0:w=1080:h=1920:color=0x17352e@0.93:t=fill:enable='between(t,17,20)',
drawtext=fontfile='C\:/Windows/Fonts/arialbd.ttf':text='START WITH WHAT THEY LIKE.':fontcolor=white:fontsize=62:x=(w-text_w)/2:y=700:enable='between(t,17,20)',
drawtext=fontfile='C\:/Windows/Fonts/arialbd.ttf':text='FOODMYWAY.APP':fontcolor=0xf6b544:fontsize=82:x=(w-text_w)/2:y=820:enable='between(t,17,20)',
drawtext=fontfile='C\:/Windows/Fonts/arial.ttf':text='Try the app free or get the $19 Survival Kit.':fontcolor=white:fontsize=38:x=(w-text_w)/2:y=930:enable='between(t,17,20)',
format=yuv420p[outv]
"@
  Set-Content -LiteralPath $filter -Value $graph -Encoding utf8
  & $ffmpeg -y -loop 1 -i (Join-Path $root $video.image) -loop 1 -i (Join-Path $assets 'food-my-way-app.png') -loop 1 -i (Join-Path $assets 'survival-kit-page.png') -f lavfi -i 'anullsrc=channel_layout=stereo:sample_rate=48000' -filter_complex $graph -map '[outv]' -map 3:a -t 20 -r 30 -c:v libx264 -preset medium -crf 18 -c:a aac -b:a 128k -movflags +faststart (Join-Path $out $video.file)
  if($LASTEXITCODE -ne 0){throw "FFmpeg failed for $($video.file)"}
}
