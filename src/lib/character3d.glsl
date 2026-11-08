// Karakterler (deneme). Her karede çizilir; gövde esner, gözler kırpar, aksesuar gövdeyle oynar.
// Başlık (sürüm, FRAG, CHAR) lib/character3d.tsx'te eklenir. Her karakter kendi programına derlenir
// (#define CHAR n), böylece program küçük kalır.
// Malzeme Dots'taki gibi: yoğun keçe peluş gövde (Lokum silikon, klasik Nook pürüzsüz), renkli ya da
// kömür rengi dolgulu aksesuar, minik parlak gözler, küçük gülümseme.
// 0 Lokum, 1 Pamuk, 2 Damla, 3 Mantar, 4 Mırnav, 5 Pırıl, 6 Nook (klasik)

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uColor;     // gövde rengi (sRGB)
uniform vec3 uAccCol;    // aksesuar rengi (sRGB); çok koyuysa kömür malzeme
uniform float uSquash;   // 1 normal, <1 basık, >1 uzamış (hacim korunur)
uniform float uHop;      // zıplama yüksekliği
uniform float uTilt;     // yana yatma (radyan, tabandan)
uniform vec2 uLook;      // gözlerin baktığı yön (-1..1)
uniform float uBlink;    // 0 açık, 1 kapalı
uniform float uHappy;    // 0..1: gözler ^ ^ olur, ağız açılır
uniform float uSleepy;   // 0..1: göz kapakları iner
uniform float uWide;     // 0..1: şaşkın, gözler büyür
uniform float uAccOn;    // aksesuar takılı mı
uniform float uPulse;    // aksesuarın ritimle esnemesi (Lokum'un kulaklığı)
uniform vec2 uTurn;      // gövdenin dönüşü: x sağa-sola, y yukarı-aşağı (radyan)
uniform float uSpin;     // tam dönüş (Pırıl)
uniform vec2 uLag;       // aksesuarın gövdeden geride kalması (ikincil hareket)
uniform float uBlush;    // 0..1 yanak kızarması
uniform float uMouth;    // 0 kapalı, 1 küçük o, 2 esneme
uniform float uEar;      // karaktere özel: Mırnav'ın kulak seğirmesi, Mantar'ın şapkasını indirmesi

const float GROUND = -.56;

mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float sdBox(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xy)-t.x,p.z);return length(q)-t.y;}
float sdTorusY(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
float sdCylX(vec3 p,float r,float h,float rr){vec2 d=abs(vec2(length(p.yz),p.x))-vec2(r-rr,h-rr);return min(max(d.x,d.y),0.)+length(max(d,0.))-rr;}
float sdEll(vec3 p,vec3 r){float k0=length(p/r);float k1=length(p/(r*r));return k0*(k0-1.)/k1;}
float sdCap(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
// y ekseni boyunca yuvarlak koni: altta r1, h yukarıda r2
float sdRoundCone(vec3 p,float r1,float r2,float h){
  vec2 q=vec2(length(p.xz),p.y);
  float b=(r1-r2)/h,a=sqrt(1.-b*b),k=dot(q,vec2(-b,a));
  if(k<0.) return length(q)-r1;
  if(k>a*h) return length(q-vec2(0.,h))-r2;
  return dot(q,vec2(a,b))-r1;
}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float smax(float a,float b,float k){return -smin(-a,-b,k);}
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}

// ── Karaktere özel parçalar ───────────────────────────────────────────────
// EYE: (gözlerin yarı aralığı, yüksekliği, ölçeği); EYER: açık gözün yarıçapları; MOUTH_Y;
// SMILE: boştayken küçük gülümseme (0 ağızsız); CHEEK: yanak merkezi; FUR: peluş miktarı
// bodyM: gövde (x mesafe, y malzeme: 0 renkli, 3 fildişi); faceZ: yüzün o noktadaki derinliği;
// accD: aksesuar (x mesafe, y malzeme: 2 aksesuar, 4 altın)

#if CHAR == 0
// Lokum: köşeleri yuvarlak, şişkin küp; pudra şekerli silikon; dolgulu kulaklık
const vec3 EYE = vec3(.2,.05,1.);
const vec2 EYER = vec2(.05,.074);
const float MOUTH_Y = -.12;
const float SMILE = 1.;
const vec2 CHEEK = vec2(.36,-.09);
const float FUR = 0.;
const vec3 B = vec3(.64,.5,.5);
vec2 bodyM(vec3 q){
  q.x+=.012*sin(q.y*4.+.6);
  vec3 u=q/B;
  float d=sdBox(q,B,.4);
  d-=.085*(1.-dot(u,u)/3.);
  return vec2(d,0.);
}
float faceZ(vec2 p){vec2 u=p/B.xy;return .5+.085*(2.-dot(u,u))/3.;}
float faceExtra(vec3 q){return 1e3;}
vec2 accD(vec3 q){
  q.xy-=uLag;
  vec3 h=q-vec3(0.,.06,0.);
  float band=sdTorus(h*vec3(1.,1.3,1.),vec2(.76,.085))/1.3;
  band=max(band,-h.y-.02);
  band=smin(band,length((h-vec3(0.,.53,0.))*vec3(.42,1.6,.9))-.07,.05);
  float cs=1.+.06*uPulse;
  vec3 c=vec3(abs(q.x)-.72,q.y-.02,q.z);
  float cup=sdCylX(c-vec3(.06,0.,0.),.23*cs,.085,.07);
  float pad=sdTorus(vec3(c.z,c.y,c.x+.04),vec2(.16*cs,.075));
  return vec2(min(band,min(cup,pad)),2.);
}
#endif

#if CHAR == 1
// Pamuk: tüylü, hafif yamuk top; kalın örgü atkı, ucu önden sarkar
const vec3 EYE = vec3(.15,.07,.9);
const vec2 EYER = vec2(.05,.07);
const float MOUTH_Y = -.06;
const float SMILE = 1.;
const vec2 CHEEK = vec2(.3,-.04);
const float FUR = 1.2;
const vec3 R1 = vec3(.6,.54,.56);
vec2 bodyM(vec3 q){
  // elde yapılmış gibi: bir yanı biraz daha dolgun
  q.y-=.03*sin(q.x*3.+.8);
  return vec2(sdEll(q-vec3(0.,-.02,0.),R1),0.);
}
float faceZ(vec2 p){p.y-=.03*sin(p.x*3.+.8);p.y+=.02;return R1.z*sqrt(max(0.,1.-dot(p/R1.xy,p/R1.xy)));}
float faceExtra(vec3 q){return 1e3;}
vec2 accD(vec3 q){
  vec3 s=q-vec3(0.,-.27,0.);
  float a=atan(s.z,s.x);
  // örgü: halka boyunca kabarık ilmekler
  float knit=.014*sin(a*30.)*sin(s.y*40.+1.);
  float ring=sdTorusY(s*vec3(1.,1.15,1.),vec2(.53,.11))/1.15-knit;
  // sarkan uç: biraz yana, gövdeyle birlikte sallanır
  vec3 t=q-vec3(.22,-.36,.5);
  t.x+=uLag.x*.6*smoothstep(0.,-.2,t.y);
  t.xy=rot(.18)*t.xy;
  float tail=sdBox(t-vec3(0.,-.06,0.),vec3(.09,.14,.035),.034)-.012*sin(t.y*45.);
  return vec2(smin(ring,tail,.04),2.);
}
#endif

#if CHAR == 2
// Damla: peluş damla; yuvarlak çerçeveli gözlük
const vec3 EYE = vec3(.15,-.02,.85);
const vec2 EYER = vec2(.05,.07);
const float MOUTH_Y = -.17;
const float SMILE = 1.;
const vec2 CHEEK = vec2(.28,-.14);
const float FUR = .75;
vec2 bodyM(vec3 q){
  // ucu hafifçe kıvrık
  q.x-=.05*pow(max(q.y-.15,0.)*2.2,2.);
  return vec2(sdRoundCone(q-vec3(0.,-.1,0.),.46,.05,.62),0.);
}
float faceZ(vec2 p){return sqrt(max(0.,.2116-p.x*p.x-(p.y+.1)*(p.y+.1)));}
float faceExtra(vec3 q){return 1e3;}
vec2 accD(vec3 q){
  q.y-=uLag.y;
  vec3 c=vec3(abs(q.x),q.y,q.z);
  // çerçeve yüze göre döner
  vec3 r=c-vec3(.15,-.02,.485);
  r.xz=rot(.34)*r.xz;
  float ring=sdTorus(r,vec2(.115,.022));
  float bridge=sdCap(q,vec3(-.05,.0,.51),vec3(.05,.0,.51),.02);
  float temple=sdCap(c,vec3(.26,.0,.4),vec3(.47,.02,-.02),.018);
  return vec2(min(min(ring,bridge),temple),2.);
}
#endif

#if CHAR == 3
// Mantar: peluş benekli şapka, fildişi sap gövde; papyon
const vec3 EYE = vec3(.12,-.2,.75);
const vec2 EYER = vec2(.05,.07);
const float MOUTH_Y = -.31;
const float SMILE = 1.;
const vec2 CHEEK = vec2(.24,-.29);
const float FUR = .6;
const vec3 RS = vec3(.4,.31,.36);
vec3 capSpace(vec3 q){
  // utanınca şapkasını öne indirip gözlerini saklar
  q-=vec3(0.,.04-.07*uEar,0.);
  q.yz=rot(.28*uEar)*q.yz;
  return q;
}
vec2 bodyM(vec3 q){
  float stem=sdEll(q-vec3(0.,-.25,0.),RS);
  vec3 c=capSpace(q);
  float cap=sdEll(c-vec3(0.,.06,0.),vec3(.74,.46,.7));
  cap=smax(cap,-(c.y-.02),.07);
  float d=smin(stem,cap,.05);
  float m=(cap<stem && c.y>.08) ? 0. : 3.;
  return vec2(d,m);
}
float faceZ(vec2 p){p.y+=.25;return RS.z*sqrt(max(0.,1.-dot(p/RS.xy,p/RS.xy)));}
float faceExtra(vec3 q){return 1e3;}
vec2 accD(vec3 q){
  vec3 b=q-vec3(0.,-.45,.3);
  b.x-=uLag.x*.5;
  b.xy=rot(uLag.x*-1.5)*b.xy;
  float knot=sdEll(b,vec3(.048,.05,.045));
  vec3 l=vec3(abs(b.x)-.1,b.y,b.z+.01);
  float pinch=mix(.45,1.,smoothstep(-.08,.06,l.x));
  float lobe=sdEll(l,vec3(.1,.075*pinch,.05));
  return vec2(smin(knot,lobe,.025),2.);
}
#endif

#if CHAR == 4
// Mırnav: peluş kedi; renkli tasma, altın çıngırak
const vec3 EYE = vec3(.18,.01,.9);
const vec2 EYER = vec2(.05,.07);
const float MOUTH_Y = -.15;
const float SMILE = 1.;
const vec2 CHEEK = vec2(.34,-.1);
const float FUR = .9;
const vec3 RC = vec3(.6,.48,.52);
float ear(vec3 q,float s,float tw){
  vec3 e=q-vec3(s*.31,.3,-.02);
  e.xy=rot(s*(.38+tw))*e.xy;
  e.z*=1.6;
  return sdRoundCone(e,.16,.04,.27);
}
vec2 bodyM(vec3 q){
  float d=sdEll(q-vec3(0.,-.08,0.),RC);
  d=smin(d,ear(q,-1.,0.),.07);
  d=smin(d,ear(q,1.,uEar*.35),.07);
  return vec2(d,0.);
}
float faceZ(vec2 p){p.y+=.08;return RC.z*sqrt(max(0.,1.-dot(p/RC.xy,p/RC.xy)));}
// burun: minik, gözlerle aynı koyu malzeme
float faceExtra(vec3 q){return sdEll(q-vec3(0.,-.075,faceZ(vec2(0.,-.075))+.0),vec3(.042,.028,.03));}
vec2 accD(vec3 q){
  float col=sdTorusY((q-vec3(0.,-.28,0.))*vec3(1.,1.3,1.),vec2(.55,.05))/1.3;
  vec3 b=q-vec3(0.,-.33,.52);
  b.xy=rot(uLag.x*-2.)*(b.xy+vec2(0.,.05))-vec2(0.,.05);
  float bell=length(b-vec3(0.,-.03,0.))-.072;
  bell=max(bell,-sdBox(b-vec3(0.,-.075,0.),vec3(.085,.008,.085),.004));
  return bell<col ? vec2(bell,4.) : vec2(col,2.);
}
#endif

#if CHAR == 5
// Pırıl: peluş kabarık yıldız; arkasında dalgalanan pelerin
const vec3 EYE = vec3(.13,.04,.8);
const vec2 EYER = vec2(.05,.07);
const float MOUTH_Y = -.08;
const float SMILE = 1.;
const vec2 CHEEK = vec2(.24,-.04);
const float FUR = .7;
float star2(vec2 p,float r,float rf){
  const vec2 k1=vec2(.809016994375,-.587785252292);
  const vec2 k2=vec2(-k1.x,k1.y);
  p.x=abs(p.x);
  p-=2.*max(dot(k1,p),0.)*k1;
  p-=2.*max(dot(k2,p),0.)*k2;
  p.x=abs(p.x);
  p.y-=r;
  vec2 ba=rf*vec2(-k1.y,k1.x)-vec2(0.,1.);
  float h=clamp(dot(p,ba)/dot(ba,ba),0.,r);
  return length(p-ba*h)*sign(p.y*ba.x-p.x*ba.y);
}
float starT(vec2 p){return .25+.1*(1.-smoothstep(0.,.45,length(p)));}
float star2r(vec2 p){return star2(p-vec2(0.,-.03),.5,.56)-.09;}
vec2 bodyM(vec3 q){
  float d2=star2r(q.xy);
  float T=starT(q.xy);
  vec2 w=vec2(d2+T,abs(q.z));
  return vec2((min(max(w.x,w.y),0.)+length(max(w,0.))-T)*.8,0.);
}
float faceZ(vec2 p){float T=starT(p);float wx=max(star2r(p)+T,0.);return sqrt(max(T*T-wx*wx,0.));}
float faceExtra(vec3 q){return 1e3;}
vec2 accD(vec3 q){
  vec3 c=q-vec3(0.,.16,-.24);
  float y=-c.y;
  float tie=sdTorusY(q-vec3(0.,.17,-.02),vec2(.2,.03));
  tie=max(tie,-(q.z+.1));
  if(y<-.1||y>.8) return vec2(min(max(abs(y-.35)-.45,.1),tie),2.);
  float hw=.24+.62*clamp(y,0.,.72);
  // rüzgârda dalgalanır; hızlı hareket edince daha çok
  float wave=(.035+.3*abs(uLag.x))*sin(y*7.-uTime*6.5+c.x*3.)*y;
  float zoff=-.12*y*y-.05*y+wave;
  float dz=c.z-zoff;
  c.x-=uLag.x*.8*y;
  float d=max(abs(dz)-.02,abs(c.x)-hw);
  d=max(d,max(-y,y-.72));
  return vec2(min(d*.6,tie),2.);
}
#endif

#if CHAR == 6
// Nook (klasik): pürüzsüz yuvarlak; uygulamadaki gibi iri hap gözler, ağızsız; aksesuarı yok
// (göz ölçüleri Eye.tsx'teki 3.6×7.6 hap ve nook3d küre yerleşimiyle aynı orantıda)
#define PILL 1
const vec3 EYE = vec3(.19,-.03,1.35);
const vec2 EYER = vec2(.064,.136);
const float MOUTH_Y = -.14;
const float SMILE = 0.;
const vec2 CHEEK = vec2(.33,-.1);
const float FUR = 0.;
const float RN = .57;
vec2 bodyM(vec3 q){return vec2(length(q-vec3(0.,.01,0.))-RN,0.);}
float faceZ(vec2 p){p.y-=.01;return sqrt(max(0.,RN*RN-dot(p,p)));}
float faceExtra(vec3 q){return 1e3;}
vec2 accD(vec3 q){return vec2(1e3,2.);}
#endif

// ── Ortak: yerleşim, gözler, gölgelendirme ───────────────────────────────

// Dünya noktasını gövdenin kendi uzayına çevirir: zıplama, tabandan yatma, esneme
vec3 local(vec3 p, out float k){
  p.y-=uHop;
  vec3 q=p-vec3(0.,GROUND,0.);
  q.xy=rot(uTilt)*q.xy;
  float s=uSquash, w=inversesqrt(s);
  q.y/=s; q.xz/=w;
  k=min(s,w);
  q+=vec3(0.,GROUND,0.);
  vec3 c=vec3(0.,-.05,0.);
  q-=c;
  q.xz=rot(-uTurn.x-uSpin)*q.xz;
  q.yz=rot(uTurn.y)*q.yz;
  return q+c;
}

// Göz (2B): açık oval, kapanırken incelir, mutluyken yay, uykuluyken ‿
float eye2(vec2 e){
  float big=1.+.32*uWide;
  vec2 r=EYER*big;
  float open=max(1.-uBlink,.1);
#ifdef PILL
  // hap: iki ucu tam yuvarlak dikey çubuk; kırparken boyu kısalır
  vec2 hb=vec2(r.x,max(r.y*open,r.x*.35));
  float rr=min(hb.x,hb.y);
  vec2 hd=abs(e)-hb+rr;
  float dO=length(max(hd,0.))+min(max(hd.x,hd.y),0.)-rr;
#else
  float dO=(length(e/vec2(r.x,r.y*open))-1.)*min(r.x,r.y*open);
#endif
  vec2 a=e-vec2(0.,-.035);
  float arc=abs(length(a)-.062)-.017;
  if(a.y<.012) arc=min(length(a-vec2(-.058,.012)),length(a-vec2(.058,.012)))-.017;
  vec2 b=e-vec2(0.,.03);
  float shut=abs(length(b)-.058)-.014;
  if(b.y>-.018) shut=min(length(b-vec2(-.055,-.018)),length(b-vec2(.055,-.018)))-.014;
  return mix(mix(dO,shut,clamp(uSleepy,0.,1.)),arc,uHappy);
}

// Ağız (2B): boştayken ince ‿, mutluyken açık yarım ay, şaşkınken o, esnerken büyük oval
float mouth2(vec2 m){
  if(uMouth>.04){
    vec2 mr=mix(vec2(.036,.04),vec2(.05,.075),clamp(uMouth-1.,0.,1.))*min(uMouth,1.);
    return (length(m/mr)-1.)*min(mr.x,mr.y);
  }
  if(SMILE<.5) return 1e3;
  // ince gülümseme: yayın alt kısmı, uçları yuvarlak
  vec2 c=m-vec2(0.,.045);
  float line=abs(length(c)-.06)-.0115;
  if(c.y>-.03) line=min(length(c-vec2(-.052,-.03)),length(c-vec2(.052,-.03)))-.0115;
  // açık ağız: üstü düz yarım daire
  vec2 o=m-vec2(0.,.03);
  float open=max(length(o*vec2(1.,.9))-.078,o.y+.006)-.006;
  return mix(line,open,smoothstep(.3,.9,uHappy));
}

float eyesD(vec3 q){
  if(q.z<0.) return 1e3;
  vec2 lk=uLook*vec2(.06,.04)*EYE.z;
  vec2 c=EYE.xy;
  float dl=eye2((q.xy-vec2(-c.x,c.y)-lk)/EYE.z);
  float dr=eye2((q.xy-vec2(c.x,c.y)-lk)/EYE.z);
  float d2=min(dl,dr)*EYE.z;
  d2=min(d2,mouth2((q.xy-vec2(lk.x*.6,MOUTH_Y))/EYE.z)*EYE.z);
  // yüzeye gömülü, hafifçe kabarık (peluşta tüyün üstüne çıkar)
  float z=q.z-faceZ(q.xy)+.016-FUR*.03;
  vec2 w=vec2(d2+.006,abs(z)-.034+.006);
  return min(min(max(w.x,w.y),0.)+length(max(w,0.))-.006,faceExtra(q));
}

float furD(vec3 q){
  // gözlerin ve ağzın çevresi temiz kalsın: yüz tüyün içinde kaybolmasın
  vec2 e=vec2(abs(q.x)-EYE.x,q.y-EYE.y);
  float face=min(length(e),length(vec2(q.x,q.y-MOUTH_Y)*vec2(.8,1.)));
  float clean=mix(.3,1.,smoothstep(.07,.2,face)*step(0.,q.z)+step(q.z,0.));
  return FUR*(.024*noise(q*5.)+.016*noise(q*13.)+.009*noise(q*31.))*clean;
}

// x: mesafe, y: malzeme (0 gövde, 1 göz/ağız, 2 aksesuar, 3 fildişi, 4 altın)
vec2 map(vec3 p){
  float k; vec3 q=local(p,k);
  vec2 r=bodyM(q);
  if(FUR>0.) r.x-=furD(q);
  float e=eyesD(q); if(e<r.x) r=vec2(e,1.);
  if(uAccOn>.5){vec2 a=accD(q); if(a.x<r.x) r=a;}
  r.x*=k*(FUR>0. ? .75 : .9);
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

// Mantar şapkasındaki benekler
float spots(vec3 q){
#if CHAR == 3
  vec3 c=capSpace(q)-vec3(0.,.06,0.);
  vec3 d=normalize(c/vec3(.74,.46,.7));
  const vec3 SP[7]=vec3[7](vec3(0.,1.,.12),vec3(.62,.55,.55),vec3(-.5,.62,.6),vec3(-.12,.5,.86),vec3(.3,.3,.9),vec3(-.8,.4,-.1),vec3(.75,.5,-.3));
  const float SR[7]=float[7](.2,.16,.15,.12,.1,.17,.14);
  float s=0.;
  for(int i=0;i<7;i++) s=max(s,smoothstep(SR[i],SR[i]-.03,length(d-normalize(SP[i]))));
  return s*step(.1,c.y+.06);
#else
  return 0.;
#endif
}

// Peluş (keçe) yüzey: yumuşak sarmalayan ışık, tel tel doku, kenarda tüy uçları aydınlanır
vec3 felt(vec3 base,vec3 p,vec3 n,float ndv,float wrapK,float sh,float o,vec3 key,vec3 fill,vec3 back){
  float wrap=clamp((dot(n,key)+wrapK)/(1.+wrapK),0.,1.);
  vec3 deep=base*base*1.25+base*.12;
  vec3 col=mix(deep*.6,base*.95,wrap*mix(.5,1.,sh));
  col+=base*.28*clamp((dot(n,fill)+.3)/1.3,0.,1.);
  col+=base*(.14+.12*n.y);
  float fib=noise(p*95.)*.6+noise(p*210.)*.4;
  col*=.84+.28*fib;
  // tüy uçları: silüette yumuşak, açık hale
  float rim=smoothstep(.55,.0,ndv);
  col=mix(col,mix(base,vec3(1.),.12)*(.85+.25*clamp(dot(n,back)+.6,0.,1.)),rim*.75);
  col*=mix(.55,1.,max(o,rim));
  return col;
}

vec3 shade(vec3 p,vec3 n,vec3 v,float id){
  vec3 key=normalize(vec3(-.55,.85,.65));
  vec3 fill=normalize(vec3(.8,.15,.55));
  vec3 back=normalize(vec3(.2,.5,-.9));
  float o=ao(p,n);
  float sh=softShadow(p+n*.004,key);
  float ndv=clamp(dot(n,v),0.,1.);
  float fres=pow(1.-ndv,4.);
  float k; vec3 q=local(p,k);
  vec3 h=normalize(key+v);
  vec3 col;
  if(id<.5 || (id>2.5 && id<3.5)){
    vec3 base=pow(uColor,vec3(2.2));
    if(id>2.5) base=pow(vec3(.97,.91,.8),vec3(2.2));
    base=mix(base,pow(vec3(.99,.96,.88),vec3(2.2)),id<.5 ? spots(q) : 0.);
#if CHAR == 4
    // kulakların içi açık pembe
    float inner=smoothstep(.36,.46,q.y)*smoothstep(.1,.3,n.z)*smoothstep(.2,.1,abs(abs(q.x)-.33));
    base=mix(base,pow(vec3(1.,.72,.75),vec3(2.2)),inner*.75);
#endif
    if(FUR>0.){
      col=felt(base,p,n,ndv,.6,sh,o,key,fill,back);
      col*=mix(.7,1.,smoothstep(-.62,.2,q.y));
    } else {
      float wrap=clamp((dot(n,key)+.45)/1.45,0.,1.);
      vec3 sss=base*base*1.4+base*.15;
      col=mix(sss*.55,base*.92,wrap*mix(.45,1.,sh));
      col+=base*.32*clamp((dot(n,fill)+.3)/1.3,0.,1.)*vec3(.92,.96,1.08);
      col+=base*(.18+.14*n.y);
#if CHAR == 6
      // klasik Nook: pürüzsüz, yumuşak parlak vinil
      col+=vec3(1.)*ggx(n,h,.3)*.22*sh;
      col+=vec3(.75,.8,.9)*fres*.25;
#else
      col+=vec3(1.,.97,.92)*ggx(n,h,.62)*.05*sh;
      col+=mix(base,vec3(1.),.25)*fres*.3*clamp(dot(n,back)+.6,0.,1.);
      col+=base*base*.5*pow(1.-ndv,2.5)*clamp(dot(-n,key)+.4,0.,1.);
#endif
#if CHAR == 0
      // pudra şekeri: üst yüzlerde ince toz, seyrek taneler
      float top=smoothstep(.35,.95,n.y);
      float grain=step(.965,hash(floor(q*170.)));
      col=mix(col,vec3(.97,.96,.98)*mix(.6,1.,sh),top*(.03+.4*grain));
#endif
      col*=mix(.62,1.,smoothstep(-.62,.25,q.y));
      col*=mix(.5,1.,o);
    }
#if CHAR == 3
    // şapkanın altındaki lameller
    float under=step(2.5,id)*smoothstep(.12,.0,abs(capSpace(q).y-.04))*step(.3,length(q.xz));
    col*=1.-.35*under*(.5+.5*sin(atan(q.z,q.x)*60.));
#endif
    vec2 ck=vec2(abs(q.x)-CHEEK.x,q.y-CHEEK.y);
    float cheek=exp(-dot(ck,ck)/.008)*smoothstep(.0,.2,n.z);
    col=mix(col,pow(vec3(1.,.42,.5),vec3(2.2))*.9,cheek*uBlush*.55);
  } else if(id<1.5){
    vec3 base=vec3(.006,.005,.007);
    // açık ağzın alt yarısında dil
    float tongue=step(q.y,EYE.y-.1)*smoothstep(.3,.9,uHappy)*step(uMouth,.04)*smoothstep(MOUTH_Y-.01,MOUTH_Y-.04,q.y);
    base=mix(base,pow(vec3(1.,.45,.5),vec3(2.2))*.7,tongue);
    col=base*(.6+.4*o);
    col+=vec3(1.,.98,.94)*pow(max(dot(n,h),0.),90.)*1.6;
    col+=vec3(.6,.7,.9)*fres*.08;
  } else if(id<2.5){
    vec3 ac=pow(uAccCol,vec3(2.2));
    if(dot(uAccCol,vec3(.3,.59,.11))<.15){
      // dolgulu kömür aksesuar: yumuşak kadife parlaklık
      vec3 base=vec3(.045,.045,.05);
#if CHAR == 1
      base*=.85+.3*noise(q*vec3(60.,20.,60.));
#endif
      float wrap=clamp((dot(n,key)+.3)/1.3,0.,1.);
      col=base*(.3+.8*wrap*mix(.4,1.,sh));
      col+=vec3(.9,.92,1.)*ggx(n,h,.42)*.05*sh;
      col+=vec3(.3,.31,.36)*fres*.22;
      col+=base*clamp(dot(n,fill),0.,1.)*.6;
      col*=mix(.5,1.,o);
    } else {
      // renkli dolgulu kumaş
      col=felt(ac,p*.6,n,ndv,.4,sh,o,key,fill,back);
#if CHAR == 1
      col*=.85+.3*noise(q*vec3(60.,20.,60.));
#endif
    }
  } else {
    // altın çıngırak: yumuşak metal
    vec3 base=pow(vec3(1.,.8,.38),vec3(2.2));
    float wrap=clamp((dot(n,key)+.2)/1.2,0.,1.);
    col=base*(.18+.6*wrap*mix(.4,1.,sh));
    col+=mix(base,vec3(1.),.4)*ggx(n,h,.25)*.5*sh;
    col+=base*fres*.5;
    col*=mix(.5,1.,o);
  }
  return col;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  vec3 ro=vec3(0.,.62,5.2), ta=vec3(0.,-.02,0.);
  vec3 f=normalize(ta-ro), r=normalize(cross(f,vec3(0.,1.,0.))), u=cross(r,f);
  vec3 rd=normalize(uv.x*r+uv.y*u+2.35*f);
  float t=3.,id=-1.,minD=1e3; vec3 minP=ro;
  for(int i=0;i<130;i++){
    vec3 p=ro+rd*t;
    vec2 m=map(p);
    if(m.y<.5&&m.x<minD){minD=m.x;minP=p;}
    if(m.x<.0006){id=m.y;break;}
    t+=m.x;
    if(t>8.)break;
  }
  // zemindeki yumuşak gölge (zıplayınca küçülüp açılır)
  float tg=(GROUND-ro.y)/rd.y;
  vec3 g=ro+rd*tg;
  float lift=1.+uHop*2.2;
  float shadow=exp(-(g.x*g.x/(.42*lift)+(g.z+.05)*(g.z+.05)/(.16*lift))*1.6)*.42/lift;
  vec3 col;
  float alpha=1.;
  if(id<0.){
    // peluşsa kenarda yumuşak tüy halesi (tel tel, noktalı değil)
    float lim=.04*FUR;
    if(FUR>0. && minD<lim){
      float s=noise(minP*55.)*.55+noise(minP*130.)*.45;
      alpha=pow(smoothstep(lim,0.,minD),1.4)*smoothstep(.2,.65,s);
    } else alpha=0.;
    if(alpha<=0.){FRAG=vec4(0.,0.,0.,shadow);return;}
    float k; vec3 q=local(minP,k);
    col=pow(uColor,vec3(2.2))*(.75+.4*clamp((q.y+.4)*1.1,0.,1.));
  } else {
    vec3 p=ro+rd*t;
    col=shade(p,normal(p),-rd,id);
  }
  col=pow(aces(col*.95),vec3(1./2.2));
  FRAG=vec4(col*alpha,alpha+shadow*(1.-alpha));
}
