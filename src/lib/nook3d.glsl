// Başlık (sürüm, FRAG, ZERO) lib/nook3d.ts'de eklenir.
// ZERO: döngüler sabitten başlamasın — Windows'ta (ANGLE → D3D) derleyici sabit döngüleri açıp
// map()'i onlarca kez kopyalıyordu; derleme dakikalar sürüp sayfayı donduruyordu.
precision highp float;
uniform int uZero;
uniform vec2 uRes;
uniform float uSpan;
uniform int uShape, uHat, uGlasses, uNeck, uFace;
uniform float uFur;
uniform int uTex; // 0 vinil, 1 peluş, 2 mat kil, 3 jöle, 4 metalik, 5 benekli, 6 galaksi, 7 örgü, 8 lav, 9 kamuflaj,
                  // 10 mermer, 11 cam, 12 ışıltı, 13 ekose, 14 çizgili, 15 kot, 16 piksel, 17 kabarık, 18 altın, 19 krom
uniform vec3 uColor;
uniform vec4 uEye; // y, gap, z
uniform vec3 uAcc; // renkli aksesuarın rengi (şapka)
uniform float uHatY; // başlığın gövdeye göre dikey kayması (gövdenin tepesi küreden alçak/yüksekse)

float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float sdSph(vec3 p,float r){return length(p)-r;}
float sdEll(vec3 p,vec3 r){float k0=length(p/r);float k1=length(p/(r*r));return k0*(k0-1.)/k1;}
float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xy)-t.x,p.z);return length(q)-t.y;}
float sdCaps(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
float sdCylZ(vec3 p,float r,float h,float rr){vec2 d=abs(vec2(length(p.xy),p.z))-vec2(r-rr,h-rr);return min(max(d.x,d.y),0.)+length(max(d,0.))-rr;}
float sdCylY(vec3 p,float r,float h,float rr){return sdCylZ(p.xzy,r,h,rr);}
float sdBox2(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdTri(vec2 p,vec2 p0,vec2 p1,vec2 p2){
 vec2 e0=p1-p0,e1=p2-p1,e2=p0-p2; vec2 v0=p-p0,v1=p-p1,v2=p-p2;
 vec2 pq0=v0-e0*clamp(dot(v0,e0)/dot(e0,e0),0.,1.);
 vec2 pq1=v1-e1*clamp(dot(v1,e1)/dot(e1,e1),0.,1.);
 vec2 pq2=v2-e2*clamp(dot(v2,e2)/dot(e2,e2),0.,1.);
 float s=sign(e0.x*e2.y-e0.y*e2.x);
 vec2 d=min(min(vec2(dot(pq0,pq0),s*(v0.x*e0.y-v0.y*e0.x)),vec2(dot(pq1,pq1),s*(v1.x*e1.y-v1.y*e1.x))),vec2(dot(pq2,pq2),s*(v2.x*e2.y-v2.y*e2.x)));
 return -sqrt(d.x)*sign(d.y);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float sdStar5(vec2 p,float r,float rf){const vec2 k1=vec2(.809016994375,-.587785252292);const vec2 k2=vec2(-k1.x,k1.y);
 p.x=abs(p.x);p-=2.*max(dot(k1,p),0.)*k1;p-=2.*max(dot(k2,p),0.)*k2;p.x=abs(p.x);p.y-=r;
 vec2 ba=rf*vec2(-k1.y,k1.x)-vec2(0.,1.);float h=clamp(dot(p,ba)/dot(ba,ba),0.,r);return length(p-ba*h)*sign(p.y*ba.x-p.x*ba.y);}
// yuvarlak koni (y ekseninde): tabanda r1, h yukarıda r2
float sdRC(vec3 p,float r1,float r2,float h){vec2 q=vec2(length(p.xz),p.y);float b=(r1-r2)/h;float a=sqrt(1.-b*b);float k=dot(q,vec2(-b,a));
 if(k<0.)return length(q)-r1; if(k>a*h)return length(q-vec2(0.,h))-r2; return dot(q,vec2(a,b))-r1;}
float sdBox3(vec3 p,vec3 b,float r){vec3 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}
float hexD(vec2 p){p=abs(p);return max(p.x*.866+p.y*.5,p.y);}
float ext(float d2,float z,float h,float r){vec2 w=vec2(d2+r,abs(z)-h+r);return min(max(w.x,w.y),0.)+length(max(w,0.))-r;}
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}

float sdCloud(vec3 q){
    float d=sdEll(q-vec3(0.,-.02,0.),vec3(.78,.62,.8));
    d=smin(d,sdSph(q-vec3(-.3,.42,0.),.46),.1);
    d=smin(d,sdSph(q-vec3(.26,.46,0.),.5),.1);
    d=smin(d,sdSph(q-vec3(.66,.04,0.),.44),.1);
    d=smin(d,sdSph(q-vec3(.4,-.44,0.),.42),.1);
    d=smin(d,sdSph(q-vec3(-.14,-.52,0.),.42),.1);
    d=smin(d,sdSph(q-vec3(-.62,-.24,0.),.42),.1);
    d=smin(d,sdSph(q-vec3(-.66,.18,0.),.4),.1);
    return d;}
float body0(vec3 q);
float body(vec3 p){
  vec3 q=p; q.z*=1.28; float b=body0(q)/1.28;
  // tavşan kulakları ve salyangoz gözlerinin sapları gövdeyle tek parça (aynı renk ve doku)
  if(uHat==6){ vec3 r=p; r.x=abs(r.x); r-=vec3(.36,1.08,-.04); r.xy=rot(-.2)*r.xy;
     b=smin(b,sdEll(r,vec3(.19,.46,.13)),.12); }
  if(uHat==11){ vec3 r=p; r.x=abs(r.x);
     b=smin(b,sdCaps(r,vec3(.26,.62,.05),vec3(.44,1.2,.12),.075),.14); }
  return b; }
float body0(vec3 q){
  if(uShape==1) return sdCloud(q);
  if(uShape==2){
    vec3 r=q; r.x=abs(r.x);
    float d=sdSph(r-vec3(.4,.24,0.),.6);
    d=smin(d,sdEll(q-vec3(0.,-.08,0.),vec3(.8,.62,.62)),.3);
    d=smin(d,sdCaps(r,vec3(.22,-.1,0.),vec3(0.,-.6,0.),.34),.3);
    return d;}
  if(uShape==3){
    // düz üçgenden eşit uzaklıktaki yüzey: her yanı yuvarlak, şişkin
    float tri=sdTri(q.xy,vec2(0.,.42),vec2(-.5,-.46),vec2(.5,-.46));
    return length(vec2(max(tri,0.),q.z))-.44 + min(tri,0.)*0.;}
  if(uShape==4){
    float a=atan(q.y,q.x);float rr=.8+.075*cos(a*12.);
    vec2 w=vec2(length(q.xy)-rr+.32,abs(q.z)-.28);
    return (min(max(w.x,w.y),0.)+length(max(w,0.)))-.32;}
  if(uShape==6){
    // damla/sakız: tabanı geniş, tepesi yuvarlak (Dots'taki turuncu, turkuaz olanlar)
    float d=sdEll(q-vec3(0.,.02,0.),vec3(.9,.94,.9));
    d=smin(d,sdEll(q-vec3(0.,-.42,0.),vec3(1.1,.52,1.)),.3);
    return d;}
  if(uShape==7){
    // balkabağı: basık, dilimli; dilimler kutuplara doğru söner, tepede çukur
    float a=atan(q.z,q.x); float lobe=sqrt(abs(cos(a*4.)));
    float d=sdEll(q-vec3(0.,-.06,0.),vec3(1.06,.8,1.02));
    d-=.07*lobe*smoothstep(.85,.2,abs(q.y+.06));
    d+=.12*exp(-dot(q.xz,q.xz)*9.)*step(0.,q.y);
    return d;}
  if(uShape==8){
    // hayalet: kubbe tepe, aşağı doğru hafif açılan etek, dalgalı etek ucu
    float top=sdSph(q-vec3(0.,.2,0.),.8);
    float skirt=length(q.xz)-(.8+.13*clamp(.2-q.y,0.,1.));
    skirt=max(skirt,q.y-.2);
    float d=min(top,skirt);
    d=max(d,-(q.y+.86+.08*cos(q.x*9.+.6)*cos(q.z*2.5)));
    return d;}
  if(uShape==9){
    // şeker küp: köşeleri bol yuvarlak
    vec3 d3=abs(q)-vec3(.56,.54,.56); return length(max(d3,0.))+min(max(d3.x,max(d3.y,d3.z)),0.)-.34;}
  if(uShape==10){
    // yumurta: altı geniş, tepesi daralan
    float k=clamp(q.y,-1.,1.);
    return sdEll(q-vec3(0.,.04,0.),vec3(.8-.13*k,1.,.8-.13*k));}
  if(uShape==11){
    // tombul yıldız: düz yıldızdan eşit uzaklıktaki yüzey
    float st=sdStar5(q.xy-vec2(0.,-.04),.82,.52);
    return length(vec2(max(st,0.),q.z))-.3+min(st,0.)*0.;}
  if(uShape==12){
    // kedi: küre ve iki sivri kulak
    vec3 r=q; r.x=abs(r.x);
    float ear=sdTri(r.xy,vec2(.26,.66),vec2(.8,.4),vec2(.7,1.12));
    ear=length(vec2(max(ear,0.),r.z*1.3))-.1;
    return smin(sdSph(q-vec3(0.,-.06,0.),.92),ear,.1);}
  if(uShape==13){
    // ayıcık: küre ve iki yuvarlak kulak
    vec3 r=q; r.x=abs(r.x);
    return smin(sdSph(q-vec3(0.,-.06,0.),.92),sdSph(r-vec3(.62,.74,-.08),.3),.1);}
  if(uShape==14){
    // çilek: tepesi geniş, aşağı doğru daralan yuvarlak uç
    float k=clamp(q.y,-1.,1.);
    return sdEll(q-vec3(0.,-.02,0.),vec3(.8+.16*k,.96,.8+.16*k));}
  if(uShape==15){
    // alev: tombul taban, yana kıvrılarak sivrilen tepe, iki yanda küçük dil
    vec3 r=q-vec3(0.,-.3,0.); r.x-=.16*smoothstep(.2,1.3,r.y)*r.y;
    float d=sdRC(r,.74,.05,1.38);
    vec3 s=q; float sx=sign(s.x); s.x=abs(s.x); s-=vec3(.52,-.2,0.); s.xy=rot(.5)*s.xy;
    d=smin(d,sdRC(s,.3,.03,.62+.12*sx),.22);
    return d;}
  if(uShape==16){
    // mantar: geniş kubbe şapka, altında tombul sap
    float cap=sdEll(q-vec3(0.,.24,0.),vec3(1.08,.66,1.04)); cap=max(cap,-(q.y-.02));
    cap=smin(cap,sdEll(q-vec3(0.,.06,0.),vec3(1.,.14,.96)),.08);
    float stem=sdEll(q-vec3(0.,-.42,0.),vec3(.66,.6,.66));
    return smin(cap,stem,.12);}
  if(uShape==17){
    // su damlacığı: yuvarlak taban, tepede sivri uç
    return sdRC(q-vec3(0.,-.24,0.),.86,.05,1.26);}
  if(uShape==18){ // kurbağa: basık gövde, tepede iki göz tümseği
    float d=sdEll(q-vec3(0.,-.14,0.),vec3(1.06,.8,.96));
    vec3 r=q; r.x=abs(r.x);
    return smin(d,sdSph(r-vec3(.44,.5,.1),.33),.16);}
  if(uShape==19) return sdSph(q-vec3(0.,-.06,0.),.92); // panda: siyah kulaklar ve burun acc'de
  if(uShape==20){ // tilki: sivri, iri kulaklar
    vec3 r=q; r.x=abs(r.x);
    float ear=sdTri(r.xy,vec2(.2,.6),vec2(.86,.36),vec2(.78,1.28));
    ear=length(vec2(max(ear,0.),r.z*1.3))-.1;
    return smin(sdSph(q-vec3(0.,-.06,0.),.92),ear,.1);}
  if(uShape==21){ float k=clamp(q.y,-1.,1.); return sdEll(q-vec3(0.,-.02,0.),vec3(.84-.1*k,1.,.84-.1*k));} // penguen
  if(uShape==22){ // baykuş: kulak tüyleri
    vec3 r=q; r.x=abs(r.x);
    float tuft=sdTri(r.xy,vec2(.32,.7),vec2(.72,.62),vec2(.66,1.08)); tuft=length(vec2(max(tuft,0.),r.z*1.4))-.08;
    return smin(sdEll(q-vec3(0.,-.06,0.),vec3(.96,.94,.92)),tuft,.12);}
  if(uShape==23){ // ördek: tepede kıvrık perçem
    float d=sdSph(q-vec3(0.,-.04,0.),.94);
    d=smin(d,sdCaps(q,vec3(0.,.82,0.),vec3(.12,1.12,.06),.07),.08);
    return smin(d,sdCaps(q,vec3(.12,1.12,.06),vec3(.26,1.08,.08),.05),.04);}
  if(uShape==24) return sdEll(q-vec3(0.,-.04,0.),vec3(.94,.96,.92)); // arı
  if(uShape==25){ // yengeç: yayvan gövde, kalkık kıskaçlar, bacaklar
    float d=sdEll(q-vec3(0.,-.16,0.),vec3(1.04,.7,.9));
    vec3 r=q; r.x=abs(r.x);
    d=smin(d,sdCaps(r,vec3(.78,-.05,0.),vec3(1.06,.34,0.),.12),.1);
    float cl=sdEll(r-vec3(1.12,.56,0.),vec3(.26,.3,.2));
    cl=max(cl,-sdSph(r-vec3(1.24,.82,0.),.16));
    d=smin(d,cl,.06);
    for(int i=ZERO;i<3;i++){ float fi=float(i); d=smin(d,sdCaps(r,vec3(.5+.14*fi,-.62,.1-.1*fi),vec3(.82+.14*fi,-.9,.12-.12*fi),.06),.05); }
    return d;}
  if(uShape==26) return sdSph(q-vec3(0.,-.06,0.),.92); // ejderha: boynuz, diken, kanat accC'de
  if(uShape==27){ float tri=sdTri(q.xy,vec2(0.,.42),vec2(-.5,-.46),vec2(.5,-.46)); return length(vec2(max(tri,0.),q.z))-.44;} // karpuz dilimi
  if(uShape==28){ // cupcake: üç katlı krema (kâğıt kalıp accC'de)
    float d=sdEll(q-vec3(0.,-.1,0.),vec3(1.,.42,.95));
    d=smin(d,sdEll(q-vec3(0.,.26,0.),vec3(.78,.36,.75)),.14);
    return smin(d,sdEll(q-vec3(0.,.58,0.),vec3(.48,.3,.46)),.12);}
  if(uShape==29){ // dondurma topu, altında dalgalı kenar (külah accC'de)
    float d=sdSph(q-vec3(0.,.24,0.),.8);
    return smin(d,sdEll(q-vec3(0.,-.24,0.),vec3(.86,.2+.05*sin(atan(q.z,q.x)*6.),.86)),.12);}
  if(uShape==30){ // şeker: iki yanda büzgülü ambalaj
    vec3 r=q; r.x=abs(r.x);
    float w=sdRC(vec3(r.y,r.x-.6,r.z*1.6),.1,.42,.55);
    return smin(sdSph(q,.76),w,.08);}
  if(uShape==31) return sdTorus(q,vec2(.6,.42)); // donut
  if(uShape==32) return sdCylY(q,.84,.82,.4); // marshmallow
  if(uShape==33){ float k=clamp(q.y,-1.,1.); return sdEll(q-vec3(0.,-.12,0.),vec3(.82-.06*k*k,.92,.82-.06*k*k));} // ananas
  if(uShape==34){ // meşe palamudu: altı sivri (şapkası accC'de)
    float k=clamp(-q.y,0.,1.);
    float d=sdEll(q-vec3(0.,-.12,0.),vec3(.82-.18*k*k,.86,.82-.18*k*k));
    return smin(d,sdRC(q-vec3(0.,-1.12,0.),.04,.2,.2),.08);}
  if(uShape==35) return sdSph(q-vec3(0.,-.04,0.),.92); // portakal
  if(uShape==36){ float d=sdSph(q-vec3(0.,-.06,0.),.9); return d+.1*exp(-dot(q.xz,q.xz)*10.)*step(0.,q.y);} // kiraz
  if(uShape==37||uShape==38) return sdCloud(q); // yağmur, fırtına bulutu
  if(uShape==39){ // kristal: altıgen, iki ucu sivri; yanında küçük bir kristal
    float d=max(hexD(q.xz)-.56,abs(q.y+.05)+hexD(q.xz)*1.1-1.1)-.02;
    vec3 r=q; r.x=abs(r.x); r-=vec3(.56,-.38,-.12); r.xy=rot(.5)*r.xy;
    return min(d,max(hexD(r.xz)-.28,abs(r.y)+hexD(r.xz)*1.1-.62)-.02);}
  if(uShape==40){ // yaprak: iki ucu sivri, hafif kıvrık
    vec3 r=q; r.xy=rot(-.12)*r.xy; r.z+=.18*r.y*r.y-.1;
    float l=max(length(r.xy-vec2(.62,0.))-1.15,length(r.xy+vec2(.62,0.))-1.15);
    return length(vec2(max(l,0.),r.z))-.18;}
  if(uShape==41){ // kaktüs: dilimli gövde, iki kol
    float a=atan(q.z,q.x);
    float d=sdCaps(q,vec3(0.,-.66,0.),vec3(0.,.42,0.),.6)+.03*abs(cos(a*5.));
    d=smin(d,sdCaps(q,vec3(.45,-.2,0.),vec3(.86,-.2,0.),.2),.08);
    d=smin(d,sdCaps(q,vec3(.86,-.2,0.),vec3(.86,.3,0.),.2),.06);
    d=smin(d,sdCaps(q,vec3(-.45,.02,0.),vec3(-.84,.02,0.),.18),.08);
    return smin(d,sdCaps(q,vec3(-.84,.02,0.),vec3(-.84,.42,0.),.18),.06);}
  if(uShape==42){ // kaya: yamru yumru
    float d=sdEll(q-vec3(0.,-.1,0.),vec3(1.,.8,.92));
    return d+.16*(noise(q*2.1+1.3)-.5)+.05*(noise(q*5.3)-.5);}
  if(uShape==43){ // kütük: kabuklu silindir, yanda kesik dal
    float a=atan(q.z,q.x);
    float d=sdCylY(q-vec3(0.,-.12,0.),.8,.8,.12);
    d+=.025*abs(sin(a*9.+noise(q*3.)*2.))*step(q.y,.62);
    return smin(d,sdCaps(q,vec3(.62,.05,0.),vec3(1.02,.32,0.),.13),.08);}
  if(uShape==44){ // güneş: küre ve on ışın
    float a=atan(q.y,q.x); float sec=6.2831853/10.; float aa=mod(a+sec*.5,sec)-sec*.5;
    float rl=length(q.xy); vec2 l=vec2(rl*cos(aa),rl*sin(aa));
    return smin(sdSph(q,.76),sdRC(vec3(l.y,l.x-.7,q.z),.17,.03,.42),.08);}
  if(uShape==45) return sdSph(q-vec3(0.,-.04,0.),.92); // ay (kraterler gölgelendirmede)
  if(uShape==5){
    return smin(sdSph(q-vec3(-.12,.3,0.),.66),sdSph(q-vec3(.1,-.3,0.),.68),.55)+.0;}
  return sdSph(q,1.);
}

float witchCone(vec3 q){
  float h=sdCylY(q,.98,.03,.03);
  for(int i=ZERO;i<7;i++){ float t0=float(i)/7., t1=float(i+1)/7.;
     vec3 a=vec3(-.34*t0*t0*t0,.0+.82*t0-.08*t0*t0*t0,-.1*t0*t0), b=vec3(-.34*t1*t1*t1,.0+.82*t1-.08*t1*t1*t1,-.1*t1*t1);
     float r0=mix(.46,.03,t0), r1=mix(.46,.03,t1);
     h=smin(h,sdCaps(q,a,b,mix(r0,r1,.5)),.03); }
  return h; }
// sarkık şapka (Noel, cin): x koni, y kenar, z ponpon
vec3 floppy(vec3 p){
  vec3 q=p-vec3(0.,.02,-.04); q.xy=rot(-.1)*q.xy;
  float h=1e3;
  for(int i=ZERO;i<7;i++){ float t0=float(i)/7., t1=float(i+1)/7.;
     vec3 a=vec3(1.05*t0*t0,.45+1.05*t0-.8*t0*t0,-.12*t0), b=vec3(1.05*t1*t1,.45+1.05*t1-.8*t1*t1,-.12*t1);
     h=smin(h,sdCaps(q,a,b,mix(.72,.07,(t0+t1)*.5)),.05); }
  h=max(h,-(q.y-.52));
  float cuff=length(vec2(length(q.xz)-.84,q.y-.52))-.13;
  float pom=sdSph(q-vec3(1.1,.62,-.12),.16);
  return vec3(h,cuff,pom); }

float acc(vec3 p){
  float d=1e3;
  vec3 eL=vec3(-uEye.y,uEye.x,uEye.z), eR=vec3(uEye.y,uEye.x,uEye.z);
  // gözlükler
  // Cam yarıçapı R; köprü iki camın iç kenarını yukarıdan kemerle bağlar
  float R=.27;
  float inner=uEye.y-R;
  if(uGlasses==1||uGlasses==2||uGlasses==4){
    float side = uEye.y+R;
    d=min(d,sdCaps(p,vec3(-side,uEye.x+.04,uEye.z),vec3(-side-.12,uEye.x+.08,uEye.z-.5),.032));
    d=min(d,sdCaps(p,vec3(side,uEye.x+.04,uEye.z),vec3(side+.12,uEye.x+.08,uEye.z-.5),.032));
    d=min(d,sdCaps(p,vec3(-inner,uEye.x+.05,uEye.z),vec3(0.,uEye.x+.1,uEye.z+.03),.026));
    d=min(d,sdCaps(p,vec3(inner,uEye.x+.05,uEye.z),vec3(0.,uEye.x+.1,uEye.z+.03),.026));
  }
  if(uGlasses==1){ d=min(d,sdTorus(p-eL,vec2(R,.038))); d=min(d,sdTorus(p-eR,vec2(R,.038))); }
  if(uGlasses==2){ d=min(d,sdCylZ(p-eL,R+.02,.05,.04)); d=min(d,sdCylZ(p-eR,R+.02,.05,.04)); }
  if(uGlasses==4){
     for(int s=ZERO;s<2;s++){ vec3 c=s==0?eL:eR; vec3 q=p-c; float f=abs(sdBox2(q.xy,vec2(R,R-.04),.09))-.042; d=min(d,max(f,abs(q.z)-.05)); } }
  if(uGlasses==3){ d=min(d,sdTorus(p-eR,vec2(.3,.045)));
     vec3 c=eR+vec3(.2,-.24,0.);
     for(int i=ZERO;i<6;i++){ float t=float(i)/6.; vec3 a=c+vec3(.12*t+.1*sin(t*5.),-.5*t,-.25*t); vec3 b=c+vec3(.12*(t+.17)+.1*sin((t+.17)*5.),-.5*(t+.17),-.25*(t+.17)); d=min(d,sdCaps(p,a,b,.022)); } }
  // göz bandı: sol gözün üstünde yuvarlak bant, ipi başın üstünden ve yanından geçer
  if(uGlasses==5){ vec3 q=p-eL-vec3(0.,0.,.03);
     d=min(d,sdEll(q,vec3(.25,.22,.07)));
     d=min(d,sdCaps(p,eL+vec3(.18,.16,0.),vec3(.5,.86,.34),.03));
     d=min(d,sdCaps(p,vec3(.5,.86,.34),vec3(.62,.98,-.2),.03));
     d=min(d,sdCaps(p,eL+vec3(-.2,.02,-.04),vec3(-.88,.12,.06),.03)); }
  // koruyucu gözlük: kalın yuvarlak çerçeveler, köprü ve başı saran lastik
  if(uGlasses==6){
     d=min(d,sdTorus(p-eL,vec2(R,.075))); d=min(d,sdTorus(p-eR,vec2(R,.075)));
     d=min(d,sdCaps(p,vec3(-inner+.02,uEye.x,uEye.z),vec3(inner-.02,uEye.x,uEye.z),.05));
     vec3 q=p-vec3(0.,uEye.x,0.); float band=length(vec2(length(q.xz)-.97,q.y))-.055;
     band=max(band,-(q.z-.1)); d=min(d,band); }
  // panda: siyah kulaklar ve burun; tilki burnu; arı antenleri
  if(uShape==19){ vec3 r=p; r.x=abs(r.x); d=min(d,sdSph(r-vec3(.6,.7,0.),.31)); d=min(d,sdEll(p-vec3(0.,-.36,.68),vec3(.1,.065,.05))); }
  if(uShape==20) d=min(d,sdEll(p-vec3(0.,-.42,.68),vec3(.09,.06,.05)));
  if(uShape==24){ vec3 r=p; r.x=abs(r.x); d=min(d,sdCaps(r,vec3(.2,.82,.1),vec3(.36,1.28,.18),.03)); d=min(d,sdSph(r-vec3(.37,1.32,.18),.08)); }
  // bıyık: iki kıvrık tutam
  if(uFace==1){ vec3 m=p-vec3(0.,uEye.x-.4,uEye.z-.02); m.x=abs(m.x);
     float sm=sdCaps(m,vec3(.02,0.,.02),vec3(.19,-.04,0.),.09);
     sm=smin(sm,sdCaps(m,vec3(.19,-.04,0.),vec3(.34,.04,-.07),.065),.05);
     sm=smin(sm,sdCaps(m,vec3(.34,.04,-.07),vec3(.34,.15,-.08),.04),.04);
     d=min(d,sm); }
  // başlıklar
  vec3 p0=p; p.y-=uHatY;
  if(uHat==1){ vec3 q=p-vec3(.1,.86,-.02); q.xy=rot(.26)*q.xy;
     float b=sdEll(q,vec3(.98,.3,.88)); b=smin(b,sdEll(q-vec3(0.,.1,0.),vec3(.66,.34,.62)),.2);
     d=min(d,b); d=min(d,sdCaps(q,vec3(0.,.36,0.),vec3(.02,.5,0.),.05)); }
  if(uHat==2){ vec3 q=p-vec3(0.,.02,-.08);
     float band=sdTorus(q,vec2(1.1,.075)); band=max(band,-q.y+.05);
     d=min(d,band);
     d=min(d,sdCylY(vec3(abs(q.x)-1.02,q.y,q.z).yxz,.34,.13,.1));
  }
  if(uHat==3){ vec3 q=p-vec3(.04,.78,0.); q.xy=rot(.12)*q.xy;
     float dome=max(sdSph(q-vec3(0.,.02,0.),.54),-q.y+.04); dome=smin(dome,sdCylY(q-vec3(0.,.06,0.),.5,.04,.03),.05);
     float brim=sdCylY(q-vec3(0.,.02,0.),.8,.035,.03);
     d=min(d,min(dome,brim)); }
  if(uHat==4){ d=min(d,sdCaps(p,vec3(0.,.78,0.),vec3(.1,1.3,0.),.065)); d=min(d,sdSph(p-vec3(.11,1.42,0.),.17)); }
  if(uHat==5){ vec3 q=p-vec3(.52,.78,.25); q.xy=rot(-.5)*q.xy; vec3 r=q; r.x=abs(r.x);
     float w=sdEll(r-vec3(.2,0.,0.),vec3(.22,.15,.09)); w=smin(w,sdSph(q,.08),.04); d=min(d,w); }
  if(uHat==12){ // cadı şapkası: geniş siper, ucu geriye kıvrılan koni
     vec3 q=p-vec3(.04,.76,-.04); q.xy=rot(.16)*q.xy;
     d=min(d,witchCone(q)); }
  if(uHat==14){ // yarasa tokası: küçük gövde, kulaklar, tırtıklı kanatlar
     vec3 q=p-vec3(-.5,.66,.52); q.xz=rot(.5)*q.xz; q.xy=rot(.18)*q.xy;
     float b=sdEll(q,vec3(.11,.13,.09));
     vec3 e=q; e.x=abs(e.x); b=smin(b,sdCaps(e,vec3(.04,.08,0.),vec3(.07,.2,0.),.025),.02);
     vec3 w=q; w.x=abs(w.x);
     float wing=sdTri(w.xy,vec2(.06,.06),vec2(.46,.14),vec2(.36,-.14));
     wing=max(wing,-(length(w.xy-vec2(.2,-.12))-.09));
     wing=max(wing,-(length(w.xy-vec2(.38,-.15))-.07));
     b=min(b,ext(wing,w.z,.022,.015));
     d=min(d,b); }
  if(uHat==15){ // kovboy şapkasının bandı
     vec3 q=p-vec3(.02,.8,-.04); q.xy=rot(.1)*q.xy;
     d=min(d,sdCylY(q-vec3(0.,.1,0.),.53,.055,.02)); }
  if(uHat==16){ // korsan şapkası: kubbe ve üç yandan kalkık siper
     vec3 q=p-vec3(0.,.8,-.02); q.xy=rot(.06)*q.xy;
     float a=atan(q.z,q.x); float up=.5+.5*cos(3.*(a-1.5708));
     vec3 bq=q; bq.y-=.42*up*smoothstep(.3,.95,length(q.xz));
     float brim=sdEll(bq,vec3(1.08,.12,.98))*.6;
     float crown=sdEll(q-vec3(0.,.2,-.04),vec3(.66,.44,.62)); crown=max(crown,-(q.y+.02));
     d=min(d,smin(brim,crown,.06)); }
  if(uHat==18){ // kondüktör kepinin siperi
     vec3 q=p-vec3(0.,.78,-.04); q.yz=rot(-.25)*q.yz;
     float v=sdEll(q-vec3(0.,.02,.52),vec3(.5,.035,.3)); v=max(v,-(q.z-.3)); d=min(d,v); }
  p=p0;
  // boyun
  if(uNeck==1){ vec3 q=p-vec3(0.,-.92,.42); vec3 r=q; r.x=abs(r.x); r.xy=rot(-.08)*r.xy;
     float w=sdEll(r-vec3(.22,0.,0.),vec3(.25,.16+.06*clamp(r.x*2.,0.,1.),.1)); w=smin(w,sdSph(q,.085),.04); d=min(d,w); }
  return d;
}
/** Renkli aksesuarlar: x uzaklık, y malzeme (2 şapka rengi, 3 beyaz, 4 sarı, 5 yeşil, 6 kahve, 7 kırmızı, 8 mor,
    9 hasır, 10 haki, 11 lacivert) */
vec2 accC(vec3 p){
  vec2 r=vec2(1e3,0.);
  vec3 p0=p; p.y-=uHatY;
  if(uHat==7){ // şapka (kep): kubbe + öne siper
     vec3 q=p-vec3(0.,.02,0.); q.xy=rot(.1)*q.xy;
     float dome=sdEll(q-vec3(0.,.5,-.04),vec3(.86,.62,.84)); dome=max(dome,-(q.y-.52));
     float brim=sdEll(q-vec3(.02,.55,.62),vec3(.58,.055,.46)); brim=max(brim,-(q.z-.28));
     float d=smin(dome,brim,.05); d=min(d,sdSph(q-vec3(0.,1.13,-.04),.06));
     r=vec2(d,2.); }
  if(uHat==8){ // filiz
     float stem=sdCaps(p,vec3(0.,.86,0.),vec3(.02,1.2,0.),.045);
     vec3 a=p-vec3(-.2,1.24,0.); a.xy=rot(-.45)*a.xy; vec3 b=p-vec3(.21,1.27,0.); b.xy=rot(.5)*b.xy;
     float lv=min(sdEll(a,vec3(.22,.085,.13)),sdEll(b,vec3(.23,.09,.13)));
     r=vec2(smin(stem,lv,.04),5.); }
  if(uHat==9){ // çiçek tokası: beyaz yapraklar, sarı göbek
     vec3 c=vec3(-.5,.68,.5); vec3 q=p-c; q.xz=rot(.5)*q.xz;
     float a=atan(q.y,q.x); float sec=6.2831853/5.; a=mod(a+sec*.5,sec)-sec*.5; vec2 pp=length(q.xy)*vec2(cos(a),sin(a));
     float pet=sdEll(vec3(pp.x-.2,pp.y,q.z),vec3(.16,.12,.07));
     float cen=sdSph(q-vec3(0.,0.,.05),.1);
     r = cen<pet ? vec2(cen,4.) : vec2(pet,3.); }
  if(uHat==10){ // yıldız tokası
     vec3 q=p-vec3(-.52,.62,.5); q.xz=rot(.5)*q.xz; q.xy=rot(.2)*q.xy;
     r=vec2(ext(sdStar5(q.xy,.28,.5),q.z,.07,.05),4.); }
  if(uHat==11){ // salyangoz gözleri: beyaz göz küresi
     vec3 q=p; q.x=abs(q.x);
     r=vec2(sdSph(q-vec3(.47,1.28,.15),.19),3.); }
  p=p0;
  if(uShape==7){ // balkabağı sapı (kahverengi)
     float st=sdCaps(p,vec3(0.,.5,0.),vec3(.1,.92,-.02),.085);
     st=smin(st,sdCaps(p,vec3(.1,.92,-.02),vec3(.22,.98,-.02),.06),.04);
     if(st<r.x) r=vec2(st,6.); }
  p.y-=uHatY;
  if(uHat==13){ // şeytan boynuzları (kırmızı): yana açılıp yukarı kıvrılır
     vec3 q=p; q.x=abs(q.x);
     float h=1e3;
     for(int i=ZERO;i<6;i++){ float t0=float(i)/6., t1=float(i+1)/6.;
        vec3 a=vec3(.34+.24*t0,.74+.5*t0-.1*t0*t0,.12), b=vec3(.34+.24*t1,.74+.5*t1-.1*t1*t1,.12);
        h=smin(h,sdCaps(q,a,b,mix(.15,.02,(t0+t1)*.5)),.04); }
     if(h<r.x) r=vec2(h,7.); }
  if(uHat==12){ // cadı şapkasının mor bandı
     vec3 q=p-vec3(.04,.76,-.04); q.xy=rot(.16)*q.xy;
     float band=max(sdCylY(q-vec3(0.,.12,0.),.45,.06,.02),-sdCylY(q-vec3(0.,.12,0.),.36,.2,.0));
     if(band<r.x) r=vec2(band,8.); }
  if(uHat==15){ // kovboy şapkası (kahverengi): yanları kalkık geniş siper, ortası çukur tepe
     vec3 q=p-vec3(.02,.8,-.04); q.xy=rot(.1)*q.xy;
     vec3 bq=q; bq.y-=.2*bq.x*bq.x;
     float brim=sdEll(bq,vec3(1.2,.085,.92))*.75;
     float crown=sdEll(q-vec3(0.,.3,0.),vec3(.52,.46,.48)); crown=max(crown,-(q.y-.02));
     crown=max(crown,-sdEll(q-vec3(0.,.78,0.),vec3(.1,.18,.36)));
     float h=smin(brim,crown,.05);
     if(h<r.x) r=vec2(h,6.); }
  if(uHat==16){ // korsan şapkasının beyaz kafatası
     vec3 q=p-vec3(0.,.8,-.02); q.xy=rot(.06)*q.xy;
     float sk=sdCylZ(q-vec3(0.,.22,.54),.11,.03,.02);
     sk=min(sk,sdCaps(q,vec3(-.13,.06,.55),vec3(.13,.14,.55),.025));
     sk=min(sk,sdCaps(q,vec3(.13,.06,.55),vec3(-.13,.14,.55),.025));
     if(sk<r.x) r=vec2(sk,3.); }
  if(uHat==17){ // hasır şapka: hafif sarkık geniş siper, yuvarlak tepe, kırmızı bant
     vec3 q=p-vec3(0.,.8,-.04); q.xy=rot(.08)*q.xy;
     vec3 bq=q; bq.y+=.07*dot(q.xz,q.xz);
     float brim=sdEll(bq,vec3(1.18,.045,1.02))*.85;
     float crown=sdCylY(q-vec3(0.,.24,0.),.5,.24,.16);
     float h=smin(brim,crown,.04);
     if(h<r.x) r=vec2(h,9.);
     float band=sdCylY(q-vec3(0.,.1,0.),.52,.065,.02);
     if(band<r.x) r=vec2(band,7.); }
  if(uHat==18){ // kondüktör kepi: lacivert gövde, düz tepe, sarı şerit ve rozet
     vec3 q=p-vec3(0.,.78,-.04); q.xy=rot(.05)*q.xy;
     float c=sdCylY(q-vec3(0.,.18,0.),.56,.19,.05);
     c=smin(c,sdEll(q-vec3(0.,.38,-.02),vec3(.66,.08,.62)),.06);
     if(c<r.x) r=vec2(c,11.);
     float g=sdCylY(q-vec3(0.,.07,0.),.575,.045,.01);
     g=min(g,sdSph(q-vec3(0.,.2,.56),.07));
     if(g<r.x) r=vec2(g,4.); }
  if(uHat==19){ // asker miğferi (haki): başın üstünü örten kubbe, kenarında dudak
     vec3 q=p-vec3(0.,.1,-.04);
     float h=sdSph(q,1.07); h=max(h,-(q.y-.34));
     h=min(h,length(vec2(length(q.xz)-1.04,q.y-.34))-.05);
     if(h<r.x) r=vec2(h,10.); }
  if(uHat==20){ // baret (sarı): kubbe, ortasında sırt, öne uzayan siper
     vec3 q=p-vec3(0.,.8,-.04); q.xy=rot(.06)*q.xy;
     float dome=sdEll(q,vec3(.68,.5,.66)); dome=max(dome,-q.y);
     dome=smin(dome,sdCaps(q,vec3(0.,.44,-.5),vec3(0.,.5,.4),.07),.06);
     float brim=sdEll(q-vec3(0.,.01,.14),vec3(.8,.04,.84));
     float h=smin(dome,brim,.04);
     if(h<r.x) r=vec2(h,4.); }
  if(uHat==21){ // taç (altın): yukarı açılan bant, beş uç ve topları, önde kırmızı taş
     vec3 q=p-vec3(.04,.86,-.02); q.xy=rot(.14)*q.xy;
     float rr=.54+.1*q.y;
     float band=max(abs(length(q.xz)-rr)-.045,abs(q.y-.04)-.14)-.015;
     float a=atan(q.z,q.x); float sec=6.2831853/5.; a=mod(a-1.5708+sec*.5,sec)-sec*.5;
     vec3 l=vec3(length(q.xz)*cos(a),q.y,length(q.xz)*sin(a));
     float sp=sdRC(l-vec3(.56,.12,0.),.11,.025,.3); sp=min(sp,sdSph(l-vec3(.6,.46,0.),.065));
     float g=smin(band,sp,.03);
     if(g<r.x) r=vec2(g,12.);
     float gem=sdEll(q-vec3(0.,.04,rr+.04),vec3(.09,.1,.05));
     if(gem<r.x) r=vec2(gem,7.); }
  if(uHat==22){ // parti şapkası: çizgili koni, tepede sarı ponpon
     vec3 q=p-vec3(.2,.78,0.); q.xy=rot(-.32)*q.xy;
     float c=sdRC(q,.42,.035,.9);
     if(c<r.x) r=vec2(c,15.);
     float pom=sdSph(q-vec3(0.,.97,0.),.13);
     if(pom<r.x) r=vec2(pom,4.); }
  if(uHat==23){ // örgü bere: kafayı saran örgü kubbe, kıvrık kenar, ponpon
     vec3 q=p-vec3(0.,.06,-.04);
     float dome=sdSph(q,1.05); dome=max(dome,-(q.y-.36));
     float cuff=length(vec2(length(q.xz)-.95,(q.y-.4)*.85))-.13;
     float h=smin(dome,cuff,.04);
     if(h<r.x) r=vec2(h,13.);
     float pom=sdSph(q-vec3(0.,1.18,-.02),.21);
     if(pom<r.x) r=vec2(pom,3.); }
  if(uHat==24){ // aşçı şapkası: beyaz bant ve kabarık tepe
     vec3 q=p-vec3(0.,.86,-.04); q.xy=rot(.06)*q.xy;
     float h=sdCylY(q-vec3(0.,.1,0.),.52,.15,.04);
     float puff=sdSph(q-vec3(-.34,.48,0.),.38);
     puff=smin(puff,sdSph(q-vec3(.34,.48,0.),.38),.1);
     puff=smin(puff,sdSph(q-vec3(0.,.64,0.),.42),.1);
     puff=smin(puff,sdSph(q-vec3(0.,.42,-.22),.3),.1);
     puff=smin(puff,sdSph(q-vec3(0.,.4,.2),.28),.1);
     h=smin(h,puff,.06);
     if(h<r.x) r=vec2(h,3.); }
  if(uHat==25||uHat==29){ // Noel Baba (kırmızı, beyaz kenar) ve cin (yeşil, kırmızı kenar, sarı ponpon)
     vec3 f=floppy(p);
     bool elf=uHat==29;
     if(f.x<r.x) r=vec2(f.x,elf?5.:7.);
     if(f.y<r.x) r=vec2(f.y,elf?7.:3.);
     if(f.z<r.x) r=vec2(f.z,elf?4.:3.); }
  if(uHat==26){ // hale: başın üstünde süzülen altın halka
     vec3 q=p-vec3(0.,1.3,-.02); q.xy=rot(.12)*q.xy; q.yz=rot(-.28)*q.yz;
     float h=sdTorus(q.xzy,vec2(.48,.055));
     if(h<r.x) r=vec2(h,12.); }
  if(uHat==27){ // mantar şapka: kırmızı, beyaz benekli kubbe
     vec3 q=p-vec3(0.,.02,-.02); q.xy=rot(.08)*q.xy;
     float cap=sdEll(q-vec3(0.,.6,0.),vec3(1.08,.58,1.04)); cap=max(cap,-(q.y-.56));
     cap=smin(cap,sdEll(q-vec3(0.,.58,0.),vec3(1.02,.07,.98)),.05);
     if(cap<r.x) r=vec2(cap,14.); }
  if(uHat==28){ // astronot kaskı: başı saran beyaz kabuk, önü açık; yanlarda renkli kulaklık diskleri
     vec3 q=p-vec3(0.,.02,0.);
     float sh=abs(sdSph(q,1.22))-.07;
     float win=length(vec2(q.x/.9,(q.y+.02)/.76))-1.;
     sh=max(sh,-max(win,-(q.z-.25)));
     if(sh<r.x) r=vec2(sh,3.);
     vec3 e=q; e.x=abs(e.x);
     float ear=sdCylZ((e-vec3(1.25,0.,0.)).zyx,.24,.08,.04);
     if(ear<r.x) r=vec2(ear,2.); }
  if(uHat==30){ // büyücü şapkası: mor koni, altın bant, önde sarı yıldız
     vec3 q=p-vec3(.04,.76,-.04); q.xy=rot(.16)*q.xy;
     float h=witchCone(q);
     if(h<r.x) r=vec2(h,8.);
     float band=max(sdCylY(q-vec3(0.,.12,0.),.45,.06,.02),-sdCylY(q-vec3(0.,.12,0.),.36,.2,.0));
     if(band<r.x) r=vec2(band,12.);
     vec3 sq=q-vec3(-.06,.42,.3); sq.yz=rot(-.35)*sq.yz;
     float st=ext(sdStar5(sq.xy,.13,.5),sq.z,.03,.02);
     if(st<r.x) r=vec2(st,4.); }
  p=p0;
  // ---- gövdelerin parçaları
  if(uShape==21){ // penguen gagası ve ayakları (turuncu)
     vec3 b=p-vec3(0.,-.22,.66); float bk=sdRC(vec3(b.x,b.z,b.y*1.4),.11,.02,.16);
     vec3 f=p; f.x=abs(f.x); bk=min(bk,sdEll(f-vec3(.3,-.98,.22),vec3(.18,.06,.16)));
     if(bk<r.x) r=vec2(bk,16.); }
  if(uShape==22){ float bk=sdEll(p-vec3(0.,-.24,.7),vec3(.07,.12,.06)); if(bk<r.x) r=vec2(bk,16.); } // baykuş gagası
  if(uShape==23){ // ördek gagası
     float bk=smin(sdEll(p-vec3(0.,-.34,.7),vec3(.42,.11,.28)),sdEll(p-vec3(0.,-.44,.66),vec3(.34,.08,.22)),.03);
     if(bk<r.x) r=vec2(bk,16.); }
  if(uShape==24){ // arı kanatları (saydamımsı)
     vec3 w=p; w.x=abs(w.x); w-=vec3(.6,.52,-.5); w.xy=rot(-.5)*w.xy;
     float wg=min(sdEll(w,vec3(.42,.26,.05)),sdEll(w-vec3(.08,-.3,.04),vec3(.3,.18,.05)));
     if(wg<r.x) r=vec2(wg,26.); }
  if(uShape==26){ // ejderha: krem boynuzlar, turuncu sırt dikenleri, kanatçıklar
     vec3 h=p; h.x=abs(h.x); float hn=1e3;
     for(int i=ZERO;i<5;i++){ float t0=float(i)/5., t1=float(i+1)/5.;
        hn=smin(hn,sdCaps(h,vec3(.36+.14*t0,.72+.4*t0,-.08-.2*t0),vec3(.36+.14*t1,.72+.4*t1,-.08-.2*t1),mix(.11,.03,(t0+t1)*.5)),.03); }
     if(hn<r.x) r=vec2(hn,17.);
     float sp=1e3;
     for(int i=ZERO;i<3;i++){ float th=.25+.6*float(i); vec3 l=p-vec3(0.,.92*cos(th)-.06,-.72*sin(th)); l.yz=rot(-th)*l.yz;
        sp=min(sp,sdRC(l,.13,.02,.26)); }
     if(sp<r.x) r=vec2(sp,16.);
     vec3 w=p; w.x=abs(w.x); w-=vec3(.72,.25,-.45);
     float wg=ext(sdTri(w.xy,vec2(0.),vec2(.55,.5),vec2(.5,-.1)),w.z,.03,.02);
     if(wg<r.x) r=vec2(wg,2.); }
  if(uShape==28){ // cupcake: kıvrımlı kâğıt kalıp, tepede kiraz
     vec3 q=p; q.z*=1.28; float a=atan(q.z,q.x);
     float ln=(sdRC(q-vec3(0.,-1.,0.),.6,.86,.84)+.03*abs(cos(a*9.)))/1.28;
     if(ln<r.x) r=vec2(ln,2.);
     float ch=sdSph(p-vec3(0.,.98,0.),.16); if(ch<r.x) r=vec2(ch,7.);
     float st=sdCaps(p,vec3(0.,1.1,0.),vec3(.08,1.3,-.02),.025); if(st<r.x) r=vec2(st,6.); }
  if(uShape==29){ // dondurma külahı (gofret)
     vec3 q=p; q.z*=1.28; float c=sdRC(q-vec3(0.,-1.26,0.),.04,.66,1.)/1.28;
     if(c<r.x) r=vec2(c,18.); }
  if(uShape==33){ // ananas yaprakları
     float lv=1e3;
     for(int i=ZERO;i<7;i++){ float fi=float(i); float ang=-1.05+.35*fi; vec2 dir=vec2(sin(ang),cos(ang));
        vec3 l=p-vec3(0.,.78,mod(fi,2.)*-.16)-vec3(dir*(.28+.08*(1.-abs(ang))),0.); l.xy=rot(-ang)*l.xy;
        lv=min(lv,sdEll(l,vec3(.09,.34+.1*(1.-abs(ang)),.05))); }
     if(lv<r.x) r=vec2(lv,29.); }
  if(uShape==34){ // meşe palamudu şapkası ve sapı
     float dome=sdEll(p-vec3(0.,.4,0.),vec3(.98,.5,.8)); dome=max(dome,-(p.y-.3));
     float rim=length(vec2(length(p.xz*vec2(1.,1.22))-.84,p.y-.32))-.09;
     float cap=smin(dome,rim,.05);
     if(cap<r.x) r=vec2(cap,32.);
     float st=sdCaps(p,vec3(0.,.86,0.),vec3(.06,1.1,0.),.06); if(st<r.x) r=vec2(st,6.); }
  if(uShape==35){ // portakal sapı ve yaprağı
     float st=sdCaps(p,vec3(0.,.84,0.),vec3(0.,.98,0.),.05);
     vec3 l=p-vec3(.22,.98,0.); l.xy=rot(-.4)*l.xy; st=min(st,sdEll(l,vec3(.25,.06,.12)));
     if(st<r.x) r=vec2(st,29.); }
  if(uShape==36){ // kiraz sapı ve yaprağı
     float st=sdCaps(p,vec3(0.,.78,0.),vec3(.1,1.1,-.05),.035);
     st=min(st,sdCaps(p,vec3(.1,1.1,-.05),vec3(.3,1.36,-.1),.035));
     vec3 l=p-vec3(.32,1.2,-.05); l.xy=rot(.5)*l.xy; st=min(st,sdEll(l,vec3(.24,.07,.11)));
     if(st<r.x) r=vec2(st,29.); }
  if(uShape==37){ // yağmur damlaları
     float dr=1e3;
     for(int i=ZERO;i<3;i++){ float fi=float(i); dr=min(dr,sdRC(p-vec3(-.42+.42*fi,-1.12-.14*step(.5,fi)*step(fi,1.5),.15),.09,.015,.18)); }
     if(dr<r.x) r=vec2(dr,19.); }
  if(uShape==38){ // şimşek
     vec2 b=p.xy-vec2(.05,-.92);
     float d2=min(sdTri(b,vec2(-.05,.25),vec2(.22,.25),vec2(-.12,-.1)),sdTri(b,vec2(-.2,0.),vec2(.12,0.),vec2(-.22,-.42)));
     float bo=ext(d2,p.z-.2,.05,.03);
     if(bo<r.x) r=vec2(bo,4.); }
  if(uShape==40){ float st=sdCaps(p,vec3(-.1,-.92,0.),vec3(-.12,-1.24,0.),.045); if(st<r.x) r=vec2(st,29.); } // yaprak sapı
  if(uShape==41){ // kaktüs çiçeği (pembe)
     float fl=sdSph(p-vec3(0.,1.04,0.),.12);
     for(int i=ZERO;i<5;i++){ float a=6.2831853*float(i)/5.; fl=smin(fl,sdSph(p-vec3(.13*cos(a),1.02,.13*sin(a)),.1),.04); }
     if(fl<r.x) r=vec2(fl,28.); }
  if(uShape==43){ vec3 l=p-vec3(1.06,.46,0.); l.xy=rot(-.6)*l.xy; float lf=sdEll(l,vec3(.08,.2,.05)); if(lf<r.x) r=vec2(lf,5.); } // kütükte filiz
  // ---- yeni başlıklar
  p.y-=uHatY;
  if(uHat==31){ // polis şapkası: lacivert, siyah bant ve siper, altın rozet
     vec3 q=p-vec3(0.,.74,-.04); q.xy=rot(.05)*q.xy;
     float c=sdCylY(q-vec3(0.,.18,0.),.62,.2,.05);
     c=smin(c,sdEll(q-vec3(0.,.44,.08),vec3(.86,.12,.8)),.1);
     if(c<r.x) r=vec2(c,11.);
     float bd=sdCylY(q-vec3(0.,.04,0.),.635,.06,.01);
     vec3 v=q; v.yz=rot(-.25)*v.yz;
     bd=min(bd,max(sdEll(v-vec3(0.,.02,.6),vec3(.56,.04,.34)),-(v.z-.36)));
     if(bd<r.x) r=vec2(bd,1.);
     float bg=ext(sdStar5((q.xy-vec2(0.,.26)),.13,.5),q.z-.66,.03,.02);
     if(bg<r.x) r=vec2(bg,12.); }
  if(uHat==32){ // hemşire başlığı: beyaz, önde kırmızı artı
     vec3 q=p-vec3(0.,.83,.14); q.yz=rot(-.35)*q.yz;
     float c=sdBox3(q,vec3(.4,.16,.24),.08);
     if(c<r.x) r=vec2(c,3.);
     float cr=min(sdBox2(q.xy,vec2(.12,.035),.01),sdBox2(q.xy,vec2(.035,.12),.01));
     cr=ext(cr,q.z-.24,.015,.01);
     if(cr<r.x) r=vec2(cr,7.); }
  if(uHat==33){ // viking miğferi: çelik kubbe, altın kenar, krem boynuzlar
     vec3 q=p-vec3(0.,.1,-.04);
     float h=max(sdSph(q,1.07),-(q.y-.3));
     if(h<r.x) r=vec2(h,20.);
     float rim=length(vec2(length(q.xz)-1.03,q.y-.32))-.07;
     if(rim<r.x) r=vec2(rim,12.);
     vec3 e=q; e.x=abs(e.x); float hn=1e3;
     for(int i=ZERO;i<6;i++){ float t0=float(i)/6., t1=float(i+1)/6.;
        hn=smin(hn,sdCaps(e,vec3(.85+.38*t0,.5+.12*t0+.5*t0*t0,0.),vec3(.85+.38*t1,.5+.12*t1+.5*t1*t1,0.),mix(.17,.03,(t0+t1)*.5)),.03); }
     if(hn<r.x) r=vec2(hn,17.); }
  if(uHat==34){ // şövalye miğferi: başı saran çelik, göz hizasında yarık, kırmızı sorguç
     vec3 q=p-vec3(0.,.02,0.);
     float sh=abs(sdSph(q,1.2))-.07;
     float slit=max(abs(q.y-uEye.x)-.15,max(abs(q.x)-.74,-(q.z-.3)));
     sh=max(sh,-slit);
     if(sh<r.x) r=vec2(sh,20.);
     vec3 pl=q-vec3(0.,1.32,-.22); pl.yz=rot(.5)*pl.yz;
     float pm=sdEll(pl,vec3(.12,.3,.42));
     if(pm<r.x) r=vec2(pm,7.); }
  if(uHat==35){ // pilot başlığı: deri, yanlarda kulaklık, alında koruyucu gözlük
     vec3 q=p-vec3(0.,.04,-.04);
     float cap=max(sdSph(q,1.05),-(q.y-.3));
     vec3 e=q; e.x=abs(e.x);
     cap=smin(cap,sdEll(e-vec3(.9,-.08,0.),vec3(.2,.42,.34)),.12);
     if(cap<r.x) r=vec2(cap,6.);
     float st=length(vec2(length(q.xz)-1.07,q.y-.56))-.04; st=max(st,q.z-.4);
     if(st<r.x) r=vec2(st,1.);
     vec3 g=e-vec3(.3,.56,.86); g.yz=rot(-.5)*g.yz;
     float fr=sdTorus(g,vec2(.19,.06)); if(fr<r.x) r=vec2(fr,12.);
     float ln=sdCylZ(g,.17,.03,.02); if(ln<r.x) r=vec2(ln,27.); }
  if(uHat==36){ // kaşif şapkası: bej kubbe, sarkık siper, kahverengi bant
     vec3 q=p-vec3(0.,.78,-.04); q.xy=rot(.06)*q.xy;
     float cr=max(sdEll(q-vec3(0.,.1,0.),vec3(.62,.5,.6)),-q.y);
     vec3 bq=q; bq.y+=.12*dot(q.xz,q.xz);
     float br=sdEll(bq-vec3(0.,.02,0.),vec3(1.,.05,.95))*.85;
     float h=smin(cr,br,.05);
     if(h<r.x) r=vec2(h,33.);
     float bd=sdCylY(q-vec3(0.,.1,0.),.625,.05,.01); if(bd<r.x) r=vec2(bd,6.); }
  if(uHat==37){ // dedektif şapkası: ekose kubbe, önde ve arkada siper, tepede fiyonk
     vec3 q=p-vec3(0.,.06,-.04);
     float h=max(sdSph(q,1.05),-(q.y-.35));
     float vf=max(sdEll(q-vec3(0.,.42,.8),vec3(.46,.05,.32)),-(q.z-.55));
     float vb=max(sdEll(q-vec3(0.,.42,-.8),vec3(.46,.05,.32)),q.z+.55);
     h=smin(h,min(vf,vb),.04);
     if(h<r.x) r=vec2(h,21.);
     float bw=sdEll(q-vec3(0.,1.06,0.),vec3(.16,.06,.08)); if(bw<r.x) r=vec2(bw,6.); }
  if(uHat==38){ // madenci kaskı: çelik kubbe, sırt, önde lamba
     vec3 q=p-vec3(0.,.8,-.04); q.xy=rot(.06)*q.xy;
     float dome=max(sdEll(q,vec3(.68,.5,.66)),-q.y);
     dome=smin(dome,sdCaps(q,vec3(0.,.44,-.5),vec3(0.,.5,.4),.07),.06);
     float h=smin(dome,sdEll(q-vec3(0.,.01,.14),vec3(.8,.04,.84)),.04);
     if(h<r.x) r=vec2(h,20.);
     float lb=sdCylZ(q-vec3(0.,.26,.64),.15,.07,.03); if(lb<r.x) r=vec2(lb,12.);
     float ll=sdCylZ(q-vec3(0.,.26,.7),.1,.03,.02); if(ll<r.x) r=vec2(ll,31.); }
  if(uHat==39){ // gece başlığı: yıldızlı lacivert sarkık külah, beyaz kenar ve ponpon
     vec3 f=floppy(p);
     if(f.x<r.x) r=vec2(f.x,22.);
     if(f.y<r.x) r=vec2(f.y,3.);
     if(f.z<r.x) r=vec2(f.z,3.); }
  if(uHat==40){ // palyaço peruğu: yanlarda ve tepede kıvırcık mavi tutamlar
     vec3 e=p; e.x=abs(e.x);
     float w=sdSph(e-vec3(.86,.38,-.12),.28);
     w=smin(w,sdSph(e-vec3(.98,.08,-.1),.24),.12);
     w=smin(w,sdSph(e-vec3(.72,.66,-.2),.24),.12);
     w=min(w,sdSph(p-vec3(0.,.98,-.1),.22));
     w-=.03*noise(p*5.);
     if(w<r.x) r=vec2(w,34.); }
  if(uHat==41){ // korsan bandanası: kırmızı benekli, yanda düğüm ve iki uç
     vec3 q=p-vec3(0.,.06,-.04);
     float h=max(sdSph(q,1.04),-(q.y-.3-.15*q.z));
     h=smin(h,sdSph(q-vec3(.66,.56,-.62),.14),.05);
     vec3 t=q-vec3(.78,.36,-.76); t.xy=rot(.5)*t.xy; h=min(h,sdEll(t,vec3(.08,.24,.05)));
     t=q-vec3(.62,.3,-.84); t.xy=rot(-.2)*t.xy; h=min(h,sdEll(t,vec3(.07,.22,.05)));
     if(h<r.x) r=vec2(h,14.); }
  if(uHat==42){ // kulaklı örgü bere: örgü kubbe, sarkan kulaklar ve ipleri, ponpon
     vec3 q=p-vec3(0.,.06,-.04);
     float h=max(sdSph(q,1.05),-(q.y-.36));
     vec3 e=q; e.x=abs(e.x);
     h=smin(h,sdEll(e-vec3(.9,-.04,.04),vec3(.18,.42,.34)),.12);
     if(h<r.x) r=vec2(h,13.);
     float st=sdCaps(e,vec3(.92,-.42,.08),vec3(.95,-.9,.12),.03); st=min(st,sdSph(e-vec3(.95,-.94,.12),.07));
     if(st<r.x) r=vec2(st,13.);
     float pom=sdSph(q-vec3(0.,1.16,-.02),.2); if(pom<r.x) r=vec2(pom,3.); }
  if(uHat==43){ // kar kulaklığı: ince bant, iki yanda tüylü top
     vec3 q=p-vec3(0.,.02,-.08);
     float bd=sdTorus(q,vec2(1.06,.05)); bd=max(bd,-q.y+.05);
     if(bd<r.x) r=vec2(bd,1.);
     vec3 e=q; e.x=abs(e.x);
     float mf=sdSph(e-vec3(1.04,0.,0.),.36);
     if(mf<r.x) r=vec2(mf,35.); }
  if(uHat==44){ // robot: anten (kırmızı uçlu) ve yanlarda çelik kulak diskleri
     float an=sdCaps(p,vec3(0.,.88,0.),vec3(0.,1.26,0.),.035);
     vec3 e=p; e.x=abs(e.x);
     an=min(an,sdCylZ((e-vec3(.98,0.,0.)).zyx,.28,.12,.04));
     if(an<r.x) r=vec2(an,20.);
     float tip=sdSph(p-vec3(0.,1.32,0.),.09); if(tip<r.x) r=vec2(tip,7.);
     float ring=sdCylZ((e-vec3(1.08,0.,0.)).zyx,.17,.04,.02); if(ring<r.x) r=vec2(ring,2.); }
  p=p0;
  // ---- maskeler ve gözlükler
  if(uGlasses==7||uGlasses==8){ // kahraman maskesi (kırmızı), balo maskesi (mor, altın kenarlı, sivri uçlu)
     bool ball=uGlasses==8;
     float shell=abs(sdEll(p,vec3(1.,1.,uEye.z+.05)))-.03;
     vec2 m=vec2(p.x,p.y-uEye.x-.02);
     float reg=(length(m/vec2(uEye.y+(ball?.36:.42),ball?.21:.23))-1.)*.2;
     vec2 t=vec2(abs(m.x),m.y);
     if(ball) reg=min(reg,sdCaps(vec3(t,0.),vec3(uEye.y+.2,.02,0.),vec3(uEye.y+.48,.28,0.),.07));
     vec2 e=vec2(abs(p.x)-uEye.y,p.y-uEye.x);
     float hole=(length(e/vec2(.19,.27))-1.)*.17;
     float pl=max(max(shell,reg),-hole);
     pl=max(pl,-p.z);
     if(pl<r.x) r=vec2(pl,ball?8.:7.); }
  if(uGlasses==9){ // neon panjur gözlük: ışıyan çerçeve ve yatay çıtalar
     vec3 m=p-vec3(0.,uEye.x,uEye.z+.02); m.z+=.25*m.x*m.x;
     float pl=ext(sdBox2(m.xy,vec2(uEye.y+.3,.2),.1),m.z,.025,.015);
     float inner=sdBox2(m.xy,vec2(uEye.y+.23,.14),.06);
     float sl=abs(mod(m.y+.2,.1)-.05)-.02;
     pl=max(pl,-max(inner,-sl));
     vec3 t=m; t.x=abs(t.x);
     pl=min(pl,sdCaps(t,vec3(uEye.y+.38,0.,0.),vec3(uEye.y+.5,.04,-.5),.03));
     if(pl<r.x) r=vec2(pl,24.); }
  if(uGlasses==10){ // şnorkel: tek camlı maske, başı saran bant, yanda sarı boru
     vec3 m=p-vec3(0.,uEye.x+.02,uEye.z); m.z+=.25*m.x*m.x;
     float outer=sdBox2(m.xy,vec2(uEye.y+.28,.28),.16);
     float fr=ext(abs(outer)-.05,m.z,.07,.03);
     vec3 q=p-vec3(0.,uEye.x,0.); float band=length(vec2(length(q.xz)-.97,q.y))-.055; band=max(band,-(q.z-.1));
     fr=min(fr,band);
     if(fr<r.x) r=vec2(fr,2.);
     float ln=ext(outer,m.z,.015,.01); if(ln<r.x) r=vec2(ln,27.);
     float tb=sdCaps(p,vec3(uEye.y+.42,uEye.x-.3,uEye.z-.22),vec3(uEye.y+.52,1.3,uEye.z-.4),.06);
     tb=min(tb,sdCaps(p,vec3(uEye.y+.42,uEye.x-.3,uEye.z-.22),vec3(.1,uEye.x-.5,uEye.z-.02),.06));
     if(tb<r.x) r=vec2(tb,4.); }
  // ---- yüz ve süs
  if(uFace==2){ // sakal (kızıl, kabarık)
     vec3 e=p; e.x=abs(e.x);
     float bd=sdEll(p-vec3(0.,uEye.x-.84,uEye.z-.36),vec3(.66,.46,.4));
     bd=smin(bd,sdEll(e-vec3(.62,uEye.x-.32,uEye.z-.55),vec3(.16,.36,.24)),.15);
     if(bd<r.x) r=vec2(bd,25.); }
  if(uFace==3){ float ns=sdSph(p-vec3(0.,uEye.x-.3,uEye.z+.06),.14); if(ns<r.x) r=vec2(ns,7.); } // palyaço burnu
  if(uFace==4){ // pembe nota
     vec3 c=p-vec3(.78,.7,.36); vec3 hq=c; hq.xy=rot(.4)*hq.xy;
     float nt=sdEll(hq,vec3(.12,.085,.07));
     nt=min(nt,sdCaps(c,vec3(.1,.02,0.),vec3(.1,.4,0.),.025));
     nt=min(nt,sdCaps(c,vec3(.1,.4,0.),vec3(.24,.22,0.),.03));
     if(nt<r.x) r=vec2(nt,28.); }
  if(uFace==5){ // parıltı: iki dört köşeli yıldız
     vec3 c=p-vec3(.9,.86,.3); float sp=ext(min(abs(c.x)/.08+abs(c.y)/.3-1.,abs(c.x)/.3+abs(c.y)/.08-1.)*.07,c.z,.03,.02);
     c=p-vec3(1.16,.46,.2); sp=min(sp,ext(min(abs(c.x)/.05+abs(c.y)/.18-1.,abs(c.x)/.18+abs(c.y)/.05-1.)*.045,c.z,.02,.015));
     if(sp<r.x) r=vec2(sp,4.); }
  if(uFace==6){ // baloncuklar
     float bb=min(sdSph(p-vec3(-.98,.72,.25),.2),min(sdSph(p-vec3(-1.2,.36,.2),.12),sdSph(p-vec3(1.,.86,.2),.15)));
     if(bb<r.x) r=vec2(bb,26.); }
  if(uShape==14){ // çileğin yaprakları ve sapı (yeşil)
     vec3 q=p-vec3(0.,.86,.06); q.xy=rot(.1)*q.xy; q.yz=rot(-.42)*q.yz;
     float lv=sdStar5(q.xz,.62,.4); lv=ext(lv,q.y+.32*dot(q.xz,q.xz),.04,.035);
     lv=smin(lv,sdCaps(q,vec3(0.),vec3(.05,.26,0.),.05),.05);
     if(lv<r.x) r=vec2(lv,5.); }
  if(uNeck==2){ // atkı (kırmızı): boynu saran kalın halka ve önden sarkan uç
     vec3 q=p-vec3(0.,-.74,.06);
     float sc=length(vec2(length(q.xz*vec2(1.,.92))-.72,q.y*1.15))-.17;
     sc=smin(sc,sdEll(q-vec3(.3,-.36,.66),vec3(.15,.34,.07)),.07);
     if(sc<r.x) r=vec2(sc,7.); }
  return r;
}
vec2 map(vec3 p){
  float b=body(p);
  if(uFur>0.) b -= uFur*(.035*noise(p*9.)+.018*noise(p*26.));
  float a=acc(p);
  // salyangoz gözlerinin siyah bebekleri
  if(uHat==11){ vec3 q=p; q.x=abs(q.x); a=min(a,sdSph(q-vec3(.47,1.29,.3),.095)); }
  vec2 c=accC(p);
  vec2 r=b<a?vec2(b,0.):vec2(a,1.);
  return c.x<r.x?c:r;
}
const vec3 LIGHT=vec3(-.4795,.6539,.6539); // normalize(-.55,.75,.75)
// Dörtyüzlü normal örnekleri
vec3 tet(int k){return k==0?vec3(1.,-1.,-1.):k==1?vec3(-1.,-1.,1.):k==2?vec3(-1.,1.,-1.):vec3(1.);}

/** Aksesuar malzemelerinin rengi (0 gövde, 1 siyah ayrı çizilir) */
vec3 matCol(int k){
  if(k==0) return uColor;
  if(k==2||k==13||k==15||k==24||k==35) return uAcc;
  if(k==3||k==23) return vec3(.97,.96,.94);
  if(k==4) return vec3(1.,.8,.12);
  if(k==5) return vec3(.42,.8,.2);
  if(k==6) return vec3(.36,.22,.1);
  if(k==7) return vec3(.92,.12,.1);
  if(k==8) return vec3(.55,.22,.95);
  if(k==9) return vec3(.93,.76,.42);
  if(k==10) return vec3(.33,.4,.2);
  if(k==11) return vec3(.1,.15,.36);
  if(k==12) return vec3(1.,.76,.24);
  if(k==14) return vec3(.9,.13,.12);
  if(k==16) return vec3(1.,.55,.12);
  if(k==17) return vec3(.97,.9,.74);
  if(k==18) return vec3(.86,.62,.32);
  if(k==19) return vec3(.35,.7,1.);
  if(k==20) return vec3(.7,.72,.76);
  if(k==21) return vec3(.72,.58,.4);
  if(k==22) return vec3(.12,.16,.42);
  if(k==25) return vec3(.85,.45,.16);
  if(k==26) return vec3(.8,.9,1.);
  if(k==27) return vec3(.12,.3,.4);
  if(k==28) return vec3(1.,.45,.7);
  if(k==29) return vec3(.18,.52,.2);
  if(k==31) return vec3(1.,.97,.8);
  if(k==32) return vec3(.42,.27,.13);
  if(k==33) return vec3(.82,.72,.52);
  if(k==34) return vec3(.15,.5,1.);
  return uColor; }

vec3 shade(vec3 p,vec3 n,float id,float o,float shRaw){
  vec3 v=vec3(0.,0.,1.);
  vec3 L=LIGHT;
  float wrap=clamp((dot(n,L)+.5)/1.5,0.,1.);
  float rim=pow(1.-clamp(dot(n,v),0.,1.),2.2);
  float sh=mix(.55,1.,shRaw);
  bool colored = id<.5 || id>1.5;
  if(colored){
    int k=int(id+.5);
    vec3 base=matCol(k);
    // mantar: sap ve şapkanın altı krem, renk yalnızca şapkada
    if(id<.5 && uShape==16) base=mix(vec3(.96,.9,.8),base,smoothstep(-.02,.08,p.y));
    if(id<.5){
      vec2 eL=vec2(-uEye.y,uEye.x), eR=vec2(uEye.y,uEye.x);
      float front=smoothstep(-.05,.1,p.z);
      if(uTex==18) base=vec3(1.,.78,.28);
      if(uTex==19) base=vec3(.86,.88,.92);
      // tilki: alt yanaklar ve ağız beyaz
      if(uShape==20) base=mix(base,vec3(.98,.95,.9),(1.-smoothstep(-.04,.04,p.y+.18+.3*cos(p.x*1.7)))*front);
      // penguen: önde beyaz yüz ve göbek
      if(uShape==21) base=mix(vec3(.97,.96,.94),base,clamp(smoothstep(.95,1.03,length(vec2(p.x/.6,(p.y+.14)/.84)))+1.-front,0.,1.));
      // baykuş: göz çevresinde krem halkalar, açık renk göğüs
      if(uShape==22){
        float e=min(length(p.xy-eL),length(p.xy-eR));
        base=mix(base,mix(base,vec3(1.),.5),(1.-smoothstep(.95,1.02,length(vec2(p.x/.52,(p.y+.58)/.42))))*front);
        base=mix(base,vec3(.98,.94,.84),(1.-smoothstep(.27,.3,e))*front); }
      // arı: alt yarıda siyah çizgiler
      if(uShape==24) base=mix(base,vec3(.07,.06,.06),step(.5,fract((p.y+.14)*2.6))*step(p.y,-.14));
      // ejderha: önde açık renk göbek
      if(uShape==26) base=mix(base,mix(base,vec3(1.,.92,.6),.65),(1.-smoothstep(.9,1.,length(vec2(p.x/.5,(p.y+.62)/.42))))*front);
      // karpuz: altta yeşil kabuk, beyaz şerit, üstü gövde renginde
      if(uShape==27){ base=mix(vec3(.92,.95,.8),base,smoothstep(-.53,-.48,p.y)); base=mix(vec3(.18,.5,.16),base,smoothstep(-.66,-.61,p.y)); }
      // donut: önde dalgalı kenarlı krema, arkası hamur
      if(uShape==31) base=mix(vec3(.86,.6,.34),base,smoothstep(.0,.05,p.z-.08-.06*sin(atan(p.y,p.x)*7.)));
      // kütük: üstteki kesik yüz açık renk tahta
      if(uShape==43) base=mix(base,vec3(.92,.76,.5),smoothstep(.55,.75,n.y)*step(.4,p.y));
    }
    // aksesuarlar vinil gibi parlar; şapka gövde peluşsa o da peluş
    float fur = id<.5 || id<2.5 ? uFur : 0.;
    vec3 deep=base*base*vec3(.62,.58,.7);
    vec3 col=mix(deep,base,wrap*sh);
    col+=base*.12*(.5+.5*n.y);
    col*=mix(.6,1.,o);
    // ışıyan: neon gözlük, madenci lambası
    if(k==24) return uAcc*1.25+vec3(.25)*pow(clamp(dot(n,v),0.,1.),3.)+rim*uAcc*.6;
    if(k==31) return vec3(1.,.97,.82)*1.15;
    // baloncuk: içi neredeyse görünmez, kenarı gökkuşağı
    if(k==26){
      vec3 h=normalize(L+v);
      vec3 irid=mix(vec3(1.,.6,.9),vec3(.55,.9,1.),.5+.5*n.x);
      return vec3(.42,.5,.62)*.45+rim*irid*1.3+pow(clamp(dot(n,h),0.,1.),60.)*1.1+pow(clamp(dot(n,normalize(vec3(-.5,.6,1.))),0.,1.),30.)*.5; }
    // gofret külah: çapraz ızgara
    if(k==18){ float u=abs(fract((p.x+p.y)*6.)-.5), w=abs(fract((p.x-p.y)*6.)-.5);
      col*=1.-.35*max(smoothstep(.4,.5,u),smoothstep(.4,.5,w)); return col+rim*base*.12; }
    // ekose (dedektif şapkası)
    if(k==21){ float cx=step(.5,fract(p.x*6.)), cy=step(.5,fract(p.y*6.+p.z*2.)); col*=.72+.28*abs(cx-cy); return col+rim*base*.12; }
    // gece başlığı: lacivert üstünde küçük sarı yıldızlar
    if(k==22){ vec3 g=p*7.; vec3 c=floor(g); float st=step(.7,hash(c))*smoothstep(.16,.08,length(fract(g)-.5));
      col=mix(col,vec3(1.,.85,.3)*mix(.6,1.,wrap),st); }
    // palamut şapkası: pul pul
    if(k==32){ float u=abs(fract((p.x+p.y)*5.)-.5), w=abs(fract((p.x-p.y)*5.)-.5);
      col*=.7+.4*min(u,w)*2.; col*=.9+.15*noise(p*30.); return col+rim*base*.12; }
    // altın (taç, hale, bant) ve çelik (miğferler): metal gibi ortamı yansıtır
    if((id>11.5 && id<12.5)||k==20){
      vec3 rf=reflect(-v,n);
      float env=smoothstep(-.35,.35,rf.y)*.75+.15*smoothstep(.6,1.,rf.x)+.1*smoothstep(-.6,-.95,rf.y);
      col=base*(.32+.85*env)*mix(.7,1.,o)*mix(.8,1.,sh)+base*.06;
      vec3 h=normalize(L+v);
      col+=pow(clamp(dot(n,h),0.,1.),48.)*.9*sh;
      return col+rim*mix(base,vec3(1.),.7)*.2; }
    // örgü bere: dikey örgü ilmekleri, mat yün
    if(id>12.5 && id<13.5){
      float fx=fract(atan(p.z,p.x)*7.)-.5;
      float row=fract(p.y*11.+abs(fx)*1.6);
      col*=.72+.34*(1.-abs(row-.5)*2.)*(1.-abs(fx)*.9);
      col*=.94+.08*noise(p*60.);
      return col+rim*base*.25; }
    // mantar şapka: beyaz benekler
    if(id>13.5 && id<14.5){
      vec3 g=p*3.4; vec3 c=floor(g); float sp=0.;
      for(int i=ZERO;i<8;i++){ vec3 o2=vec3(float(i&1),float((i>>1)&1),float((i>>2)&1));
        vec3 cc=c+o2; vec3 ctr=cc+vec3(hash(cc+1.3),hash(cc+2.9),hash(cc+4.1))*.6+.2;
        float r=mix(.18,.3,hash(cc+5.7))*step(.35,hash(cc+.7));
        sp=max(sp,smoothstep(r,r-.05,length(g-ctr))); }
      col=mix(col,mix(vec3(.62,.6,.6),vec3(1.),wrap*sh)*mix(.7,1.,o),sp); }
    // parti şapkası: çapraz beyaz şeritler
    if(k==15){
      float st=step(.5,fract(p.y*5.+p.x*2.2));
      col=mix(col,mix(vec3(.62,.6,.6),vec3(1.),wrap*sh)*mix(.7,1.,o),st); }
    // hasır örgü
    if(id>8.5 && id<9.5){ col*=.86+.14*step(.5,fract(atan(p.z,p.x)*9.))*step(.5,fract(p.y*14.+atan(p.z,p.x)*4.)); return col+rim*base*.1; }
    if(id<.5 && uShape==15 && uTex<2){
      // alev: içten yanar; ortası ve tabanı açık sarı, kenarlar gövdenin renginde
      float core=pow(clamp(dot(n,v),0.,1.),3.)*smoothstep(.9,-.7,p.y);
      col=mix(base*.85,mix(base,vec3(1.,.9,.45),.5),core)+base*.08;
      vec3 h=normalize(L+v);
      col+=pow(clamp(dot(n,h),0.,1.),30.)*.25*sh;
      return col+rim*mix(base,vec3(1.,.9,.5),.5)*.5;
    }
    if(id<.5 && uShape==44 && uTex<2){
      // güneş: içten ışıyan sıcak sarı
      float core=pow(clamp(dot(n,v),0.,1.),2.);
      col=mix(base*.9,mix(base,vec3(1.,.97,.75),.6),core)+base*.12;
      return col+rim*mix(base,vec3(1.,.8,.3),.5)*.6;
    }
    if(id<.5 && uShape==39 && uTex<2){
      // kristal: buz gibi, kenarları koyu, keskin parlamalar
      float thick=clamp(dot(n,v),0.,1.);
      col=mix(deep*.7,base*1.15+.12,thick)*mix(.75,1.,o);
      vec3 h=normalize(L+v);
      col+=pow(clamp(dot(n,h),0.,1.),90.)*1.2*sh+pow(clamp(dot(n,normalize(vec3(.5,.3,1.))),0.,1.),50.)*.4;
      return col+rim*mix(base,vec3(1.),.7)*.35;
    }
    if(id<.5 && (uShape==42||uShape==32) && uTex<2){
      // kaya benekli ve mat, marshmallow pudralı ve mat
      col=mix(deep,base,(wrap*.85+.15)*sh)*mix(.6,1.,o);
      if(uShape==42) col*=.82+.3*noise(p*16.);
      return col+rim*base*.1;
    }
    if(id<.5 && uTex==10){
      // mermer: ince gri damarlar
      float v1=smoothstep(.1,.0,abs(sin(p.x*2.5+p.y*1.6+noise(p*3.)*5.)));
      float v2=smoothstep(.05,.0,abs(sin(p.y*4.+p.z*2.+noise(p*6.)*4.)));
      col=mix(col,col*.42,v1*.65+v2*.35);
    }
    if(id<.5 && uTex==11){
      // cam: içi koyu ve saydam görünür, kenarlar ve parlamalar belirgin
      float thick=clamp(dot(n,v),0.,1.);
      vec3 rf=reflect(-v,n);
      float env=smoothstep(-.2,.6,rf.y);
      col=base*(.18+.3*(1.-thick))+env*.12*mix(base,vec3(1.),.6);
      vec3 h=normalize(L+v);
      col+=pow(clamp(dot(n,h),0.,1.),80.)*1.1*sh+pow(clamp(dot(n,normalize(vec3(.5,.3,1.))),0.,1.),45.)*.45;
      return col+rim*mix(base,vec3(1.),.6)*.7;
    }
    if(id<.5 && uTex==12){
      // ışıltı: karanlıkta parlayan, gölgesiz yumuşak ışık
      col=mix(base,vec3(1.),.18+.3*pow(clamp(dot(n,v),0.,1.),2.))*1.05;
      return col+rim*mix(base,vec3(1.),.4)*.55;
    }
    if(id<.5 && uTex==13){
      // ekose: koyu kuşaklar ve ince açık çizgiler
      float gx=fract(p.x*2.4), gy=fract(p.y*2.4);
      col*=1.-.2*(step(.62,gx)+step(.62,gy));
      float wl=smoothstep(.035,0.,abs(gx-.38))+smoothstep(.035,0.,abs(gy-.38));
      col=mix(col,vec3(.95)*mix(.6,1.,wrap*sh),clamp(wl,0.,1.)*.6);
      col*=.94+.08*noise(p*60.);
      return col+rim*base*.2;
    }
    if(id<.5 && uTex==14){
      // çizgili: beyaz yatay şeritler
      col=mix(col,mix(vec3(.6),vec3(1.),wrap*sh)*mix(.7,1.,o),step(.5,fract(p.y*3.)));
    }
    if(id<.5 && uTex==15){
      // kot: çapraz dokuma ve belde turuncu dikiş
      col*=.8+.24*smoothstep(.2,.8,fract((p.x+p.y)*34.));
      col*=.9+.15*noise(p*50.);
      float seam=smoothstep(.02,.0,abs(p.y+.55))*step(.5,fract(atan(p.z,p.x)*10.));
      col=mix(col,vec3(1.,.72,.3)*mix(.6,1.,wrap),seam);
      return col+rim*base*.18;
    }
    if(id<.5 && uTex==16){
      // piksel: kare kare, her karenin tonu biraz farklı
      vec3 c=floor(p*5.); vec3 f=fract(p*5.);
      col*=.85+.25*hash(c);
      float e=min(min(min(f.x,1.-f.x),min(f.y,1.-f.y)),min(f.z,1.-f.z));
      col*=.82+.18*smoothstep(.0,.08,e);
      return col+rim*base*.12;
    }
    if(id<.5 && uTex==6){
      // galaksi: koyu uzay, gövde renginde bulutsu ve yıldızlar
      float neb=noise(p*2.2)*.65+noise(p*5.)*.35;
      vec3 sky=mix(vec3(.05,.04,.16),base*1.05+vec3(.06,0.,.14),smoothstep(.3,.75,neb));
      sky=mix(sky,vec3(1.,.55,.95)*.85,smoothstep(.68,.92,neb)*.6);
      vec3 g=p*13.; vec3 c=floor(g); float hs=hash(c);
      float star=step(.86,hs)*smoothstep(.16,.0,length(fract(g)-.5-(vec3(hash(c+1.7),hash(c+3.1),hash(c+5.3))-.5)*.5));
      col=sky*mix(.55,1.,wrap*sh)*mix(.7,1.,o)+star*vec3(1.,.95,.85)*1.2;
      vec3 h=normalize(L+v);
      col+=pow(clamp(dot(n,h),0.,1.),40.)*.55*sh;
      return col+rim*mix(base,vec3(.7,.6,1.),.5)*.3;
    }
    if(id<.5 && uTex==7){
      // örgü kazak: iç içe V ilmekler, mat yün
      float fx=fract(p.x*5.)-.5;
      float row=fract(p.y*6.+abs(fx)*1.6);
      col*=.6+.5*(1.-abs(row-.5)*2.)*(1.-abs(fx)*1.1);
      col*=.94+.08*noise(p*70.);
      return col+rim*mix(base,vec3(1.),.4)*.3;
    }
    if(id<.5 && uTex==8){
      // lav: kara kaya, aralarındaki çatlaklardan gövde renginde kor
      float k1=abs(noise(p*3.2)-.5), k2=abs(noise(p*6.3+3.1)-.5);
      float crack=max(smoothstep(.045,.0,k1),smoothstep(.025,.0,k2)*.6);
      vec3 rock=mix(vec3(.2,.13,.11),base*.35,.35)*mix(.5,1.2,wrap*sh)*mix(.7,1.,o)*(.85+.3*noise(p*20.));
      vec3 glow=mix(base,vec3(1.,.9,.5),.35)*1.5;
      col=mix(rock,glow,crack)+glow*.1*smoothstep(.12,.0,k1);
      vec3 h=normalize(L+v);
      col+=pow(clamp(dot(n,h),0.,1.),24.)*.12*sh*(1.-crack);
      return col;
    }
    if(id<.5 && uTex==9){
      // kamuflaj: gövde renginin üç tonu, yamalı
      float n1=noise(p*2.6), n2=noise(p*2.6+7.3);
      vec3 tone=mix(base,deep*.55,step(.55,n1));
      tone=mix(tone,mix(base,vec3(.85,.8,.62),.45),step(.62,n2)*(1.-step(.55,n1)));
      col=mix(tone*.7,tone,wrap*sh)*mix(.6,1.,o)+tone*.08;
      return col+rim*tone*.12;
    }
    if(id<.5 && uTex==2){
      // mat kil: parlama yok, ince toprak dokusu, yumuşak ışık
      col=mix(deep,base,(wrap*.85+.15)*sh)*mix(.6,1.,o);
      col*=.93+.1*noise(p*38.);
      col+=rim*base*.08;
      return col;
    }
    if(id<.5 && uTex==3){
      // jöle: içten aydınlık, kenarları koyu, ıslak parlak
      float thick=clamp(dot(n,v),0.,1.);
      col=mix(deep*.8,base*1.18+.08,thick*thick)*mix(.75,1.,o);
      vec3 h=normalize(L+v);
      col+=pow(clamp(dot(n,h),0.,1.),70.)*.95*sh;
      col+=pow(clamp(dot(n,normalize(vec3(.5,.3,1.))),0.,1.),40.)*.35;
      col+=rim*mix(base,vec3(1.),.6)*.3;
      return col;
    }
    if(id<.5 && (uTex==4||uTex>=18)){
      // metalik: ortamı yansıtır (üstte açık gök, altta koyu zemin), keskin parlama
      vec3 rf=reflect(-v,n);
      float env=smoothstep(-.35,.35,rf.y)*.75+.15*smoothstep(.6,1.,rf.x)+.1*smoothstep(-.6,-.95,rf.y);
      col=base*(.32+.85*env)*mix(.7,1.,o)*mix(.8,1.,sh)+base*.06;
      vec3 h=normalize(L+v);
      col+=pow(clamp(dot(n,h),0.,1.),48.)*.9*sh;
      col+=rim*mix(base,vec3(1.),.7)*.22;
      return col;
    }
    if(id<.5 && uShape>=27){
      float eye=min(length(p.xy-vec2(-uEye.y,uEye.x)),length(p.xy-vec2(uEye.y,uEye.x)));
      float clear=smoothstep(.2,.3,eye);
      if(uShape==27){ // karpuz çekirdekleri
        vec3 g=p*4.2; vec3 c=floor(g); vec3 ctr=c+.5+(vec3(hash(c+1.1),hash(c+2.3),hash(c+3.7))-.5)*.4;
        vec3 dd=g-ctr; float sd=smoothstep(1.,.75,length(dd/vec3(.1,.16,.1)))*step(.45,hash(c+.3))*step(-.4,p.y)*clear;
        col=mix(col,vec3(.08,.05,.04),sd); }
      if(uShape==30){ // şeker: sarmal beyaz şeritler
        float st=step(.5,fract(atan(p.y,p.x)/6.2831853*6.+length(p.xy)*1.3))*clear;
        col=mix(col,mix(vec3(.62),vec3(1.),wrap*sh)*mix(.7,1.,o),st*step(abs(p.x),.74)); }
      if(uShape==31){ // donut serpmesi (yalnızca kremada)
        float ice=smoothstep(.0,.05,p.z-.08-.06*sin(atan(p.y,p.x)*7.));
        vec3 g=p*8.; vec3 c=floor(g); vec3 dd=g-(c+.5+(vec3(hash(c+1.1),hash(c+2.3),hash(c+3.7))-.5)*.5);
        dd.xy=rot(hash(c+4.4)*6.28)*dd.xy;
        float sp=smoothstep(1.,.7,length(dd/vec3(.26,.08,.1)))*step(.5,hash(c+.9))*ice*clear;
        float hh=hash(c+7.7);
        vec3 sc=hh<.25?vec3(1.,.4,.6):hh<.5?vec3(1.,.85,.2):hh<.75?vec3(.3,.7,1.):vec3(.97);
        col=mix(col,sc*mix(.6,1.,wrap),sp); }
      if(uShape==33){ // ananas: çapraz çizgiler ve kabarcıklar
        float a=atan(p.z,p.x)*2.4; float u=fract(a+p.y*5.), w=fract(a-p.y*5.);
        float ln=max(smoothstep(.42,.5,abs(u-.5)),smoothstep(.42,.5,abs(w-.5)));
        col=mix(col,deep*.7,ln*.8*clear); }
      if(uShape==35) col*=.9+.1*noise(p*32.); // portakal kabuğu
      if(uShape==41){ // kaktüs dikenleri
        vec3 g=p*8.; vec3 c=floor(g); float sp=step(.62,hash(c))*smoothstep(.12,.06,length(fract(g)-.5))*clear;
        col=mix(col,vec3(.97,.95,.85)*mix(.6,1.,wrap),sp); }
      if(uShape==40){ // yaprak damarları
        vec2 r=rot(-.12)*p.xy;
        float vn=smoothstep(.03,.0,abs(r.x))+smoothstep(.06,.0,abs(fract((r.y-abs(r.x)*.8)*4.)-.5)-.44)*smoothstep(.0,.08,abs(r.x));
        col=mix(col,deep*.7,clamp(vn,0.,1.)*.55*clear); }
      if(uShape==43){ // kütük: üstte halkalar, yanlarda kabuk oyukları
        float top=smoothstep(.55,.75,n.y)*step(.4,p.y);
        col*=mix(.78+.22*smoothstep(.08,.3,abs(fract(atan(p.z,p.x)*4.+noise(p*4.)*1.5)-.5)),.85+.15*smoothstep(.05,.2,abs(fract(length(p.xz)*7.)-.5)),top); }
      if(uShape==45){ // ay kraterleri
        vec3 g=p*2.6; vec3 c=floor(g); vec3 ctr=c+.5+(vec3(hash(c+1.1),hash(c+2.3),hash(c+3.7))-.5)*.4;
        float rr=mix(.2,.34,hash(c+5.5))*step(.4,hash(c+.2)); float dl=length(g-ctr);
        col*=1.-.28*smoothstep(rr,rr-.06,dl)*clear; col+=.08*smoothstep(.05,.0,abs(dl-rr))*clear; }
    }
    if(id<.5 && uShape==14){
      // çilek çekirdekleri: küçük sarı noktalar, gözlerin çevresi temiz
      vec3 g=p*6.; vec3 c=floor(g);
      vec3 ctr=c+.5+(vec3(hash(c+1.1),hash(c+2.3),hash(c+3.7))-.5)*.35;
      float sd=smoothstep(.17,.11,length(g-ctr));
      float eye=min(length(p.xy-vec2(-uEye.y,uEye.x)),length(p.xy-vec2(uEye.y,uEye.x)));
      sd*=smoothstep(.16,.26,eye)*smoothstep(.75,.6,p.y);
      col=mix(col,vec3(1.,.86,.45)*mix(.55,1.,wrap*sh),sd);
    }
    if(id<.5 && uShape==16 && uTex!=5){
      // mantar şapkasının beyaz benekleri
      vec3 g=p*3.4; vec3 c=floor(g); float sp=0.;
      for(int i=ZERO;i<8;i++){ vec3 o2=vec3(float(i&1),float((i>>1)&1),float((i>>2)&1));
        vec3 cc=c+o2; vec3 ctr=cc+vec3(hash(cc+1.3),hash(cc+2.9),hash(cc+4.1))*.6+.2;
        float r=mix(.18,.3,hash(cc+5.7))*step(.35,hash(cc+.7));
        sp=max(sp,smoothstep(r,r-.05,length(g-ctr))); }
      sp*=smoothstep(.12,.22,p.y);
      col=mix(col,mix(vec3(.62,.6,.6),vec3(1.),wrap*sh)*mix(.7,1.,o),sp);
    }
    if(id<.5 && uTex==5){
      // benekli: rastgele yuvarlak benekler (uğur böceği, dalmaçyalı)
      // yüzeye dağılmış yuvarlak benekler: hücre başına bir benek, boyu ve yeri rastgele
      vec3 g=p*2.3; vec3 c=floor(g); float sp=0.;
      for(int i=ZERO;i<8;i++){ vec3 o=vec3(float(i&1),float((i>>1)&1),float((i>>2)&1));
        vec3 cc=c+o; float h=hash(cc+.7);
        vec3 ctr=cc+vec3(hash(cc+1.3),hash(cc+2.9),hash(cc+4.1))*.6+.2;
        float r=mix(.2,.36,hash(cc+5.7))*step(.4,h);
        sp=max(sp,smoothstep(r,r-.05,length(g-ctr))); }
      // gözlerin çevresi temiz kalsın
      float eye=min(length(p.xy-vec2(-uEye.y,uEye.x)),length(p.xy-vec2(uEye.y,uEye.x)));
      sp*=smoothstep(.17,.3,eye);
      col=mix(col,deep*.45,sp);
    }
    if(fur>0. || k==23||k==25||k==34||k==35){
      float strands=noise(p*vec3(70.,70.,70.)+n*8.);
      col*=fur>0. ? .84+.26*strands : .9+.14*strands;
      col+=rim*mix(base,vec3(1.),.55)*.45;
    } else {
      vec3 h=normalize(L+v);
      col+=pow(clamp(dot(n,h),0.,1.),26.)*.28*sh;
      col+=pow(clamp(dot(n,h),0.,1.),6.)*.06;
      col+=rim*mix(base,vec3(1.),.5)*.16;
    }
    return col;
  }
  vec3 h=normalize(L+v);
  vec3 col=vec3(.03,.03,.035)*(.5+.9*clamp(dot(n,L),0.,1.))*o;
  col+=vec3(.9)*pow(clamp(dot(n,h),0.,1.),60.)*sh;
  col+=vec3(.25)*pow(clamp(dot(n,h),0.,1.),8.)*sh;
  col+=rim*.1;
  return col;
}

// Tek döngü: ışın ilerletme, normal, ortam gölgesi ve gölge sırayla aynı map() çağrısını kullanır.
// map() böylece gölgelendiricide tek kez yer alır — Windows'ta derleme süresi bunun kopya sayısıyla büyüyor.
void main(){
  vec2 uv=(gl_FragCoord.xy/uRes-.5)*uSpan;
  vec3 ro=vec3(uv,4.), rd=vec3(0.,0.,-1.);
  float t=0.,minD=1e3; vec3 minP=ro; bool hit=false;
  int phase=0, k=0;            // 0 ilerle, 1 normal, 2 ortam gölgesi, 3 gölge
  vec3 hp=ro, n=vec3(0.); float id=0., alpha=1.;
  float occ=0., occW=1., sh=1., st=.03;
  for(int it=ZERO;it<200;it++){
    vec3 q = phase==0 ? ro+rd*t : phase==1 ? hp+.0012*tet(k) : phase==2 ? hp+n*(.05*float(k+1)) : hp+n*.01+LIGHT*st;
    vec2 m=map(q);
    if(phase==0){
      if(m.y<.5 && m.x<minD){minD=m.x;minP=q;}
      if(m.x<.0008){ hit=true; hp=q; id=m.y; phase=1; continue; }
      t+=m.x*.85;
      if(t>8. || it>=139){
        // ıska: peluşsa kenarda tüy saçakları, değilse boş
        if(!(uFur>0. && minD<.07*uFur)) break;
        float s=noise(minP*80.)*.7+noise(minP*160.)*.3;
        alpha=smoothstep(.07*uFur,0.,minD)*smoothstep(.35,.75,s);
        if(alpha<=0.) break;
        hp=minP; n=normalize(vec3(minP.xy,.2)); id=0.; phase=2; k=0;
      }
    } else if(phase==1){
      n+=tet(k)*m.x; k++;
      if(k==4){ n=normalize(n); phase=2; k=0; }
    } else if(phase==2){
      occ+=(.05*float(k+1)-m.x)*occW; occW*=.7; k++;
      if(k==5){ phase=3; k=0; }
    } else {
      sh=min(sh,10.*m.x/st); st+=clamp(m.x,.02,.2); k++;
      if(sh<.01 || st>3. || k>=28){ phase=4; break; }
    }
  }
  if(phase<4){ FRAG=vec4(0.); return; }
  vec3 col=shade(hp,n,id,clamp(1.-2.2*occ,0.,1.),clamp(sh,0.,1.));
  FRAG = hit ? vec4(pow(col,vec3(.97)),1.) : vec4(col*alpha,alpha);
}
