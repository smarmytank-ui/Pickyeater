$ErrorActionPreference = 'Stop'

$ffmpeg = 'C:\Users\info\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Shared_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build-shared\bin\ffmpeg.exe'
$ffprobe = 'C:\Users\info\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Shared_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build-shared\bin\ffprobe.exe'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$videoDirectory = Join-Path $root 'output\video'
$audioDirectory = Join-Path $videoDirectory 'voiceovers'
New-Item -ItemType Directory -Force -Path $audioDirectory | Out-Null

Add-Type -AssemblyName System.Speech

$videos = @(
    @{
        Source = '01-four-safe-foods.mp4'
        Output = '01-four-safe-foods-voiced.mp4'
        Voiceover = 'Four familiar foods can become one realistic dinner. Start with chicken, potatoes, cheddar, and broccoli. Keep what works, and change only what does not. Try Food My Way free, or get the fourteen-day Picky Eater Survival Kit at Food My Way dot app.'
    },
    @{
        Source = '02-tacos-without-tomatoes.mp4'
        Output = '02-tacos-without-tomatoes-voiced.mp4'
        Voiceover = 'Hate tomatoes? The tacos can stay. Keep the tortilla, filling, and cheese. Leave out the tomato. One disliked ingredient does not have to cancel the whole dinner. Food My Way helps you swap what does not work, without starting over.'
    },
    @{
        Source = '03-picky-adults.mp4'
        Output = '03-picky-adults-voiced.mp4'
        Voiceover = 'Picky eating does not magically end at eighteen. Adults deserve private, practical meal ideas without judgment. Start with foods you actually like, keep textures predictable, and build the meal your way. Try Food My Way free at Food My Way dot app.'
    }
)

$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SelectVoice('Microsoft Zira Desktop')
$speaker.Rate = 1
$speaker.Volume = 100

try {
    foreach ($video in $videos) {
        $sourcePath = Join-Path $videoDirectory $video.Source
        $outputPath = Join-Path $videoDirectory $video.Output
        $voicePath = Join-Path $audioDirectory ($video.Output -replace '\.mp4$', '.wav')

        $speaker.SetOutputToWaveFile($voicePath)
        $speaker.Speak($video.Voiceover)
        $speaker.SetOutputToNull()

        & $ffmpeg -y -i $sourcePath -i $voicePath -map '0:v:0' -map '1:a:0' -c:v copy -af 'highpass=f=80,lowpass=f=10000,loudnorm=I=-16:TP=-1.5:LRA=11,apad=pad_dur=20' -t 20 -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart $outputPath
        if ($LASTEXITCODE -ne 0) { throw "FFmpeg failed for $($video.Output)" }

        & $ffprobe -v error -show_entries 'format=duration:stream=index,codec_name,codec_type,sample_rate,channels' -of json $outputPath
        if ($LASTEXITCODE -ne 0) { throw "FFprobe failed for $($video.Output)" }
    }
}
finally {
    $speaker.Dispose()
}
