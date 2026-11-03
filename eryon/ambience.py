# Cama sonora sutil sincronizada à timeline (sem voz): vento, brilhos das luzes, crepitar da fogueira, swell do mistério.
import numpy as np, wave
SR=44100; D=51.6; n=int(SR*D); t=np.arange(n)/SR; rng=np.random.default_rng(3)
def env(a,b,c,d): return np.clip(np.minimum((t-a)/max(b-a,1e-3),(d-t)/max(d-c,1e-3)),0,1)
def lp(x,k):  # passa-baixa de 1 polo
    y=np.empty_like(x); acc=0.0
    for i in range(0,len(x),4096):
        seg=x[i:i+4096]; out=np.empty_like(seg)
        for j,v in enumerate(seg): acc+=k*(v-acc); out[j]=acc
        y[i:i+4096]=out
    return y
L=np.zeros(n); R=np.zeros(n)
# vento: ruído marrom filtrado com rajadas lentas
w=np.cumsum(rng.standard_normal(n)); w-=lp(w,0.0005); w/=np.abs(w).max()
gust=0.55+0.45*np.sin(2*np.pi*t/7.3)*np.sin(2*np.pi*t/3.1+1)
gust*=1+0.8*env(23.9,25.0,28,29.5)   # "prestes a mudar": o vento cresce
day=1-0.5*env(43.6,44.0,60,61)
wind=w*gust*day*0.10*np.minimum(1,t/1.5)
L+=wind; R+=np.roll(wind,900)
def chime(t0,f0,amp,dur=2.5,pan=0.5):
    i0=int(t0*SR); m=min(n-i0,int(dur*SR)); tt=np.arange(m)/SR; s=np.zeros(m)
    for k,(mul,a) in enumerate([(1,1),(1.5,0.5),(2,0.35),(3.01,0.15)]):
        s+=a*np.sin(2*np.pi*f0*mul*tt+k)*np.exp(-tt*(2.2+k))
    s*=amp*np.minimum(1,tt/0.01); L[i0:i0+m]+=s*(1-pan); R[i0:i0+m]+=s*pan
notes=[523.25,659.25,783.99,880.0,987.77,1174.66]
chime(25.05,1318.5,0.05,3.5,0.4)          # a luz aparece no céu
chime(27.62,523.25,0.10,4.0,0.45); chime(27.64,783.99,0.06,4.0,0.55)  # pouso: novo habitante
for i in range(16): chime(30.5+i*0.235+0.85,notes[i%6]*(2 if i%3==0 else 1),0.035,1.6,0.2+0.6*((i*7)%10)/10)
for i in range(10): chime(34.45+i*0.12,notes[(i*2)%6],0.03,1.2,0.3+0.04*i)  # casa se ergue
chime(35.6,1046.5,0.05,2.0,0.5)           # janelas acendem
chime(48.4,1318.5,0.06,3.0,0.45); chime(49.2,659.25,0.05,2.5,0.5)     # terceira luz
# swell grave do mistério
sw=np.sin(2*np.pi*55*t)*0.6+np.sin(2*np.pi*82.4*t)*0.4
sw*=env(39.6,41.0,42.3,43.6)*0.07; L+=sw; R+=sw
# fogueira: estalos
fire=np.zeros(n); idx=rng.choice(np.arange(int(43.8*SR),int(50.68*SR)),260,replace=False)
for i in idx:
    m=min(600,n-i); fire[i:i+m]+=rng.standard_normal(m)*np.exp(-np.arange(m)/80)*rng.uniform(0.2,1)
fire=fire-lp(fire,0.2); fire*=0.05; L+=fire*0.9; R+=fire*1.1
# corte seco para preto: silêncio após a última palavra (com micro fade)
cut=np.clip((50.75-t)/0.05,0,1); L*=cut; R*=cut
st=np.stack([L,R],1); st=np.clip(st,-1,1)
with wave.open('ambience.wav','wb') as f:
    f.setnchannels(2); f.setsampwidth(2); f.setframerate(SR); f.writeframes((st*32767).astype('<i2').tobytes())
print('ok', st.std())
