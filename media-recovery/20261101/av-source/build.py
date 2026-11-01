from pathlib import Path
import subprocess,json,hashlib
R=Path(__file__).resolve().parent; ROOT=R.parent; F=ROOT/'trialmap-motion-craft-20261101/evidence/frames'
base=['ffmpeg','-v','error','-y','-threads','1','-filter_threads','1','-filter_complex_threads','1']
def run(a):subprocess.run(base+a,check=True)
S='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';T='/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf'
def txt(s,x,y,size=30,font=S,col='f6f4e8'):
 return f",drawtext=fontfile={font}:text='{s}':fontsize={size}:fontcolor=0x{col}:x={x}:y={y}"
brand=txt('TRIALMAP / FIELD NOTES',100,70,23,col='b7c7b1')+txt('Actual app captures · keyboard input · editorial timing',100,1000,18,col='91aa9b')
# Timing fits existing complete speech paragraph; no pitch/speed changes.
segments=[(0,77,'scale=804:960:flags=lanczos',1016,60,
 txt('What changes',96,330,76,T)+txt('when we',96,423,76,T)+txt('measure again?',96,516,76,T)),
 (77,62,'crop=980:620:0:0,scale=1050:-2:flags=lanczos',770,200,
 txt('120 readings.',96,330,62,T)+txt('Still 6 units.',96,415,62,T)+txt('If each pot is treated independently.',100,540,23,col='b7c7b1')),
 (139,149,'crop=980:292:0:878,scale=1280:-2:flags=lanczos',320,460,
 txt('The confound remains.',96,285,76,T)+txt('More readings do not resolve the shelf confound.',100,900,28,col='e7bd93'))]
# Map actual app frame states onto editorial timeline. No interpolated UI values.
seq=R/'frames';seq.mkdir(exist_ok=True)
for n in range(288):
 if n<29: idx=0
 elif n<77: idx=48+round((n-29)*71/47)
 elif n<96:idx=120
 else:idx=145
 p=seq/f'{n:04d}.png'
 if not p.exists():p.symlink_to(F/f'{idx:04d}.png')
for i,(start,n,crop,x,y,labels) in enumerate(segments):
 # Gentle editorial settle only. Product does not animate controls this way.
 ease=f'{y}+18*pow(1-min(t/0.6\\,1)\\,3)'
 f=f'[1:v]{crop}[card];[0:v][card]overlay=x={x}:y={ease}:shortest=1'+brand+labels+'[v]'
 run(['-f','lavfi','-i',f'color=c=0x102e27:s=1920x1080:r=24:d={n/24}','-framerate','24','-start_number',str(start),'-i',str(seq/'%04d.png'),'-filter_complex',f,'-map','[v]','-frames:v',str(n),'-c:v','libx264','-threads','1','-crf','19','-preset','ultrafast','-pix_fmt','yuv420p',str(R/f'scene{i}.mp4')])
(R/'concat.txt').write_text(''.join(f"file scene{i}.mp4\n" for i in range(3)))
run(['-f','concat','-safe','0','-i',str(R/'concat.txt'),'-c','copy',str(R/'picture.mp4')])
voice=ROOT/'trialmap-demo-20261031/scenario-audio/narration-corrected-original.mp3'
sfx=ROOT/'afterimage-v8/sfx/kit/paper-fold.wav'
# Existing original DSP paper gesture repurposed quietly; no borrowed samples/new generation.
# Two cues: keyboard gesture starts, then editorial move to invariant units. Not success.
import numpy as np
from scipy.io import wavfile
def decode(p,filters=None):
 cmd=['ffmpeg','-v','error','-i',str(p)]
 if filters:cmd+=['-af',filters]
 return np.frombuffer(subprocess.check_output(cmd+['-ar','48000','-ac','2','-f','f32le','-']),dtype='<f4').reshape(-1,2)
v=decode(voice,'atrim=start=18.945:end=26.23,asetpts=PTS-STARTPTS')
s=decode(sfx)
m=np.zeros((576000,2),dtype=np.float32)
m[48000:48000+len(v)]+=v*.75
for at in [29/24,77/24]:
 pos=round(at*48000);m[pos:pos+len(s)]+=s*.10
m*=1.8  # Fixed final gain (+5.105dB), avoids the old excessively quiet mix.
assert m.shape==(576000,2) and 0.01<np.max(np.abs(m))<.95
wavfile.write(R/'mix.wav',48000,m)
(R/'pcm-proof.json').write_text(json.dumps({'frames':len(m),'speech_frames':len(v),'peak':float(np.max(np.abs(m))),'rms':float(np.sqrt(np.mean(m*m))),'sample_rate':48000,'source_speech_rate_changed':False,'listening':False},indent=2))
run(['-i',str(R/'picture.mp4'),'-i',str(R/'mix.wav'),'-map','0:v','-map','1:a','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart',str(R/'actual-interaction-av.mp4')])
for sec,name in [(1,'question'),(2.5,'action'),(4,'count'),(6.5,'confound')]:run(['-ss',str(sec),'-i',str(R/'actual-interaction-av.mp4'),'-frames:v','1',str(R/f'{name}.png')])
audit={'status':'INTERNAL UNAPPROVED AV PROTOTYPE','duration':12,'fps':24,'voice_source_start':18.945,'voice_source_end':26.23,'voice_timeline_start':1,'voice_speed_change':False,'audio_listened':False,'sources':{str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [voice,sfx]},'cue_seconds':[29/24,77/24],'picture_cuts_seconds':[77/24,139/24],'capture_commit':'9168c7b54909bcf6d70584198a0051a13e6be128','main_modified':False,'publication':False}
(R/'audit.json').write_text(json.dumps(audit,indent=2))
