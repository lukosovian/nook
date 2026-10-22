// Karakter (deneme): Lokum. Her karede çizilir; gövde esner, gözler kırpar, kulaklık gövdeyle oynar.
// Başlık (sürüm, FRAG) lib/character3d.ts'de eklenir.
// Malzeme Dots'taki gibi: yumuşak mat silikon gövde, dolgulu kömür rengi aksesuar, minik parlak gözler.

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uColor;     // gövde rengi (sRGB)
uniform float uSquash;   // 1 normal, <1 basık, >1 uzamış (hacim korunur)
uniform float uHop;      // zıplama yüksekliği
uniform float uTilt;     // yana yatma (radyan, tabandan)
uniform vec2 uLook;      // gözlerin baktığı yön (-1..1)
uniform float uBlink;    // 0 açık, 1 kapalı
uniform float uHappy;    // 0..1: gözler ^ ^ olur
uniform float uSleepy;   // 0..1: göz kapakları iner
uniform float uWide;     // 0..1: şaşkın, gözler büyür
uniform float uPhones;   // kulaklık takılı mı
uniform float uCups;     // kulaklık kaplarının ritimle esnemesi
uniform vec2 uTurn;      // gövdenin dönüşü: x sağa-sola, y yukarı-aşağı (radyan)
uniform vec2 uLag;       // kulaklığın gövdeden geride kalması (ikincil hareket)
uniform float uBlush;    // 0..1 yanak kızarması
uniform float uMouth;    // 0 kapalı, 1 küçük o, 2 esneme

const float GROUND = -.56;
const vec3 B = vec3(.64,.5,.5);   // gövdenin yarı boyu
const float R = .4;              // köşe yuvarlaklığı

mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float sdBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xy)-t.x,p.z);return length(q)-t.y;}
float sdCylX(vec3 p,float r,float h,float rr){vec2 d=abs(vec2(length(p.yz),p.x))-vec2(r-rr,h-rr);return min(max(d.x,d.y),0.)+length(max(d,0.))-rr;}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}

// Dünya noktasını gövdenin kendi uzayına çevirir: zıplama, tabandan yatma, esneme
vec3 local(vec3 p, out float k){
  p.y-=uHop;
  vec3 q=p-vec3(0.,GROUND,0.);
  q.xy=rot(uTilt)*q.xy;
  float s=uSquash, w=inversesqrt(s);
  q.y/=s; q.xz/=w;
  k=min(s,w);
  q+=vec3(0.,GROUND,0.);
  // baktığı yöne döner (gövdenin ortası çevresinde)
  vec3 c=vec3(0.,-.05,0.);
  q-=c;
  q.xz=rot(-uTurn.x)*q.xz;
  q.yz=rot(uTurn.y)*q.yz;
  return q+c;
}

// Göz (2B): açık oval, kapanırken incelir, mutluyken yay, uykuluyken üstü düz kapak
float eye2(vec2 e){
  float big=1.+.32*uWide;
  vec2 r=vec2(.05,.074)*big;
  float open=max(1.-uBlink,.1);
  float dO=(length(e/vec2(r.x,r.y*open))-1.)*min(r.x,r.y*open);
  // ^ şeklinde yay (mutlu)
  vec2 a=e-vec2(0.,-.035);
  float arc=abs(length(a)-.062)-.017;
  if(a.y<.012) arc=min(length(a-vec2(-.058,.012)),length(a-vec2(.058,.012)))-.017;
  // ‿ şeklinde kapalı göz (uykulu)
  vec2 b=e-vec2(0.,.03);
  float shut=abs(length(b)-.058)-.014;
  if(b.y>-.018) shut=min(length(b-vec2(-.055,-.018)),length(b-vec2(.055,-.018)))-.014;
  return mix(mix(dO,shut,clamp(uSleepy,0.,1.)),arc,uHappy);
}

float bodyD(vec3 q){
  // elde yapılmış gibi hafif kusur
  q.x+=.012*sin(q.y*4.+.6);
  vec3 u=q/B;
  float d=sdBox(q,B,R);
  // şişkin yüzler: ortalar dışa kabarır
  d-=.085*(1.-dot(u,u)/3.);
  return d;
}

vec2 eyesD(vec3 q){
  vec2 lk=uLook*vec2(.06,.04);
  vec2 c=vec2(.2,.05);
  float dl=eye2(q.xy-vec2(-c.x,c.y)-lk);
  float dr=eye2(q.xy-vec2(c.x,c.y)-lk);
  float d2=min(dl,dr);
  // ağız: şaşkınken küçük o, esnerken büyükçe oval
  if(uMouth>.04){
    vec2 m=q.xy-vec2(0.,-.13);
    vec2 mr=mix(vec2(.036,.04),vec2(.05,.075),clamp(uMouth-1.,0.,1.))*min(uMouth,1.);
    d2=min(d2,(length(m/mr)-1.)*min(mr.x,mr.y));
  }
  // yüzeye gömülü, hafif kabarık
  float z=q.z-.5;
  vec2 w=vec2(d2+.006,abs(z)-.06+.006);
  return vec2(min(max(w.x,w.y),0.)+length(max(w,0.))-.006, 1.);
}

float phonesD(vec3 q){
  if(uPhones<.5) return 1e3;
  q.xy-=uLag;
  // kafa bandı: başın üstüne oturan basık yay
  vec3 h=q-vec3(0.,.06,0.);
  float band=sdTorus(h*vec3(1.,1.3,1.),vec2(.76,.085))/1.3;
  band=max(band,-h.y-.02);
  // tepede başa değen yastık
  band=smin(band,length((h-vec3(0.,.53,0.))*vec3(.42,1.6,.9))-.07,.05);
  // kaplar ve süngerleri
  float cs=1.+.06*uCups;
  vec3 c=vec3(abs(q.x)-.72,q.y-.02,q.z);
  float cup=sdCylX(c-vec3(.06,0.,0.),.23*cs,.085,.07);
  float pad=sdTorus(vec3(c.z,c.y,c.x+.04),vec2(.16*cs,.075));
  return min(band,min(cup,pad));
}

// x: mesafe, y: malzeme (0 gövde, 1 göz, 2 aksesuar)
vec2 map(vec3 p){
  float k; vec3 q=local(p,k);
  vec2 r=vec2(bodyD(q),0.);
  vec2 e=eyesD(q); if(e.x<r.x) r=e;
  float ph=phonesD(q); if(ph<r.x) r=vec2(ph,2.);
  r.x*=k*.9;
  return r;
}

vec3 normal(vec3 p){
  const vec2 e=vec2(.0009,-.0009);
  return normalize(e.xyy*map(p+e.xyy).x+e.yyx*map(p+e.yyx).x+e.yxy*map(p+e.yxy).x+e.xxx*map(p+e.xxx).x);
}
float ao(vec3 p,vec3 n){
  float o=0.,w=1.;
  for(int i=1;i<=5;i++){float h=.04*float(i);o+=(h-map(p+n*h).x)*w;w*=.72;}
  return clamp(1.-2.4*o,0.,1.);
}
float softShadow(vec3 p,vec3 l){
  float s=1.,t=.02;
  for(int i=0;i<26;i++){float h=map(p+l*t).x;s=min(s,9.*h/t);t+=clamp(h,.02,.18);if(s<.01||t>2.5)break;}
  return clamp(s,0.,1.);
}
float ggx(vec3 n,vec3 h,float r){float a=r*r;float d=max(dot(n,h),0.);float x=d*d*(a*a-1.)+1.;return a*a/(3.14159*x*x);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}

vec3 shade(vec3 p,vec3 n,vec3 v,float id){
  vec3 key=normalize(vec3(-.55,.85,.65));
  vec3 fill=normalize(vec3(.8,.15,.55));
  vec3 back=normalize(vec3(.2,.5,-.9));
  float o=ao(p,n);
  float sh=softShadow(p+n*.004,key);
  float ndv=clamp(dot(n,v),0.,1.);
  float fres=pow(1.-ndv,4.);
  vec3 col;
  if(id<.5){
    vec3 base=pow(uColor,vec3(2.2));
    // silikon: ışık yüzeyin içinde biraz dağılır, gölge tarafı koyulaşmaz, doygunlaşır
    float wrap=clamp((dot(n,key)+.45)/1.45,0.,1.);
    vec3 sss=base*base*1.4+base*.15;
    col=mix(sss*.55,base*.92,wrap*mix(.45,1.,sh));
    col+=base*.32*clamp((dot(n,fill)+.3)/1.3,0.,1.)*vec3(.92,.96,1.08);
    col+=base*(.18+.14*n.y);
    // geniş, sönük parlama: mat yüzey
    vec3 h=normalize(key+v);
    col+=vec3(1.,.97,.92)*ggx(n,h,.62)*.05*sh;
    col+=mix(base,vec3(1.),.25)*fres*.3*clamp(dot(n,back)+.6,0.,1.);
    // pudra şekeri: üst yüzlerde ince toz, seyrek taneler
    vec3 q; float k; q=local(p,k);
    float top=smoothstep(.35,.95,n.y);
    float grain=step(.965,hash(floor(q*170.)));
    col=mix(col,vec3(.97,.96,.98)*mix(.6,1.,sh),top*(.03+.4*grain));
    // alta doğru koyulaşır: gövdenin ağırlığı
    col*=mix(.62,1.,smoothstep(-.62,.25,q.y));
    col*=mix(.5,1.,o);
    // yanaklar
    vec2 ck=vec2(abs(q.x)-.36,q.y+.09);
    float cheek=exp(-dot(ck,ck)/.008)*smoothstep(.2,.45,q.z);
    col=mix(col,pow(vec3(1.,.42,.5),vec3(2.2))*.9,cheek*uBlush*.55);
    // ince kenarlarda ışık içinden geçer (silikon)
    col+=base*base*.5*pow(1.-ndv,2.5)*clamp(dot(-n,key)+.4,0.,1.);
  } else if(id<1.5){
    // gözler: koyu kömür, cam gibi küçük ışık
    vec3 base=vec3(.025,.022,.028);
    vec3 h=normalize(key+v);
    col=base*(.6+.4*o);
    col+=vec3(1.,.98,.94)*pow(max(dot(n,h),0.),90.)*1.6;
    col+=vec3(.6,.7,.9)*fres*.08;
  } else {
    // dolgulu kömür aksesuar: yumuşak kadife parlaklık
    vec3 base=vec3(.045,.045,.05);
    float wrap=clamp((dot(n,key)+.3)/1.3,0.,1.);
    vec3 h=normalize(key+v);
    col=base*(.3+.8*wrap*mix(.4,1.,sh));
    col+=vec3(.9,.92,1.)*ggx(n,h,.42)*.05*sh;
    col+=vec3(.3,.31,.36)*fres*.22;
    col+=base*clamp(dot(n,fill),0.,1.)*.6;
    col*=mix(.5,1.,o);
  }
  return col;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  vec3 ro=vec3(0.,.62,5.2), ta=vec3(0.,-.02,0.);
  vec3 f=normalize(ta-ro), r=normalize(cross(f,vec3(0.,1.,0.))), u=cross(r,f);
  vec3 rd=normalize(uv.x*r+uv.y*u+2.35*f);
  float t=3.,id=-1.;
  for(int i=0;i<110;i++){
    vec2 m=map(ro+rd*t);
    if(m.x<.0006){id=m.y;break;}
    t+=m.x;
    if(t>8.)break;
  }
  if(id<0.){
    // zemindeki yumuşak gölge (zıplayınca küçülüp açılır)
    float tg=(GROUND-ro.y)/rd.y;
    vec3 g=ro+rd*tg;
    float lift=1.+uHop*2.2;
    float s=exp(-(g.x*g.x/(.42*lift)+(g.z+.05)*(g.z+.05)/(.16*lift))*1.6)*.42/lift;
    FRAG=vec4(0.,0.,0.,s);
    return;
  }
  vec3 p=ro+rd*t;
  vec3 n=normal(p);
  vec3 col=shade(p,n,-rd,id);
  col=aces(col*.95);
  FRAG=vec4(pow(col,vec3(1./2.2)),1.);
}
