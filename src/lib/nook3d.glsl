precision highp float;
uniform vec2 uRes;
uniform float uSpan;
uniform int uShape, uHat, uGlasses, uNeck;
uniform float uFur;
uniform vec3 uColor;
uniform vec4 uEye; // y, gap, z
uniform vec3 uAcc; // renkli aksesuarın rengi (şapka)

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
float ext(float d2,float z,float h,float r){vec2 w=vec2(d2+r,abs(z)-h+r);return min(max(w.x,w.y),0.)+length(max(w,0.))-r;}
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
 return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}

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
  if(uShape==1){
    float d=sdEll(q-vec3(0.,-.02,0.),vec3(.78,.62,.8));
    d=smin(d,sdSph(q-vec3(-.3,.42,0.),.46),.1);
    d=smin(d,sdSph(q-vec3(.26,.46,0.),.5),.1);
    d=smin(d,sdSph(q-vec3(.66,.04,0.),.44),.1);
    d=smin(d,sdSph(q-vec3(.4,-.44,0.),.42),.1);
    d=smin(d,sdSph(q-vec3(-.14,-.52,0.),.42),.1);
    d=smin(d,sdSph(q-vec3(-.62,-.24,0.),.42),.1);
    d=smin(d,sdSph(q-vec3(-.66,.18,0.),.4),.1);
    return d;}
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
  if(uShape==5){
    return smin(sdSph(q-vec3(-.12,.3,0.),.66),sdSph(q-vec3(.1,-.3,0.),.68),.55)+.0;}
  return sdSph(q,1.);
}

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
     for(int s=0;s<2;s++){ vec3 c=s==0?eL:eR; vec3 q=p-c; float f=abs(sdBox2(q.xy,vec2(R,R-.04),.09))-.042; d=min(d,max(f,abs(q.z)-.05)); } }
  if(uGlasses==3){ d=min(d,sdTorus(p-eR,vec2(.3,.045)));
     vec3 c=eR+vec3(.2,-.24,0.);
     for(int i=0;i<6;i++){ float t=float(i)/6.; vec3 a=c+vec3(.12*t+.1*sin(t*5.),-.5*t,-.25*t); vec3 b=c+vec3(.12*(t+.17)+.1*sin((t+.17)*5.),-.5*(t+.17),-.25*(t+.17)); d=min(d,sdCaps(p,a,b,.022)); } }
  // başlıklar
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
  if(uHat==4){ d=min(d,sdCaps(p,vec3(0.,.9,0.),vec3(.1,1.3,0.),.03)); d=min(d,sdSph(p-vec3(.11,1.38,0.),.11)); }
  if(uHat==5){ vec3 q=p-vec3(.52,.78,.25); q.xy=rot(-.5)*q.xy; vec3 r=q; r.x=abs(r.x);
     float w=sdEll(r-vec3(.2,0.,0.),vec3(.22,.15,.09)); w=smin(w,sdSph(q,.08),.04); d=min(d,w); }
  // boyun
  if(uNeck==1){ vec3 q=p-vec3(0.,-.92,.42); vec3 r=q; r.x=abs(r.x); r.xy=rot(-.08)*r.xy;
     float w=sdEll(r-vec3(.22,0.,0.),vec3(.25,.16+.06*clamp(r.x*2.,0.,1.),.1)); w=smin(w,sdSph(q,.085),.04); d=min(d,w); }
  return d;
}
/** Renkli aksesuarlar: x uzaklık, y malzeme (2 şapka rengi, 3 beyaz, 4 sarı, 5 yeşil) */
vec2 accC(vec3 p){
  vec2 r=vec2(1e3,0.);
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
vec3 nrm(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(map(p+e.xyy).x-map(p-e.xyy).x,map(p+e.yxy).x-map(p-e.yxy).x,map(p+e.yyx).x-map(p-e.yyx).x));}
float ao(vec3 p,vec3 n){float o=0.,s=1.;for(int i=1;i<6;i++){float h=.05*float(i);o+=(h-map(p+n*h).x)*s;s*=.7;}return clamp(1.-2.2*o,0.,1.);}
float shadow(vec3 p,vec3 l){float r=1.,t=.03;for(int i=0;i<28;i++){float h=map(p+l*t).x;r=min(r,10.*h/t);t+=clamp(h,.02,.2);if(r<.01||t>3.)break;}return clamp(r,0.,1.);}

vec3 shade(vec3 p,vec3 n,float id){
  vec3 v=vec3(0.,0.,1.);
  vec3 L=normalize(vec3(-.55,.75,.75));
  float wrap=clamp((dot(n,L)+.5)/1.5,0.,1.);
  float rim=pow(1.-clamp(dot(n,v),0.,1.),2.2);
  float o=ao(p,n);
  float sh=mix(.55,1.,shadow(p+n*.01,L));
  bool colored = id<.5 || id>1.5;
  if(colored){
    vec3 base = id<.5 ? uColor : id<2.5 ? uAcc : id<3.5 ? vec3(.97,.96,.94) : id<4.5 ? vec3(1.,.8,.12) : vec3(.42,.8,.2);
    // aksesuarlar vinil gibi parlar; şapka gövde peluşsa o da peluş
    float fur = id<.5 || id<2.5 ? uFur : 0.;
    vec3 deep=base*base*vec3(.62,.58,.7);
    vec3 col=mix(deep,base,wrap*sh);
    col+=base*.12*(.5+.5*n.y);
    col*=mix(.6,1.,o);
    if(fur>0.){
      float strands=noise(p*vec3(70.,70.,70.)+n*8.);
      col*=.84+.26*strands;
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

void main(){
  vec2 uv=(gl_FragCoord.xy/uRes-.5)*uSpan;
  vec3 ro=vec3(uv,4.), rd=vec3(0.,0.,-1.);
  float t=0.,minD=1e3; vec3 minP=ro; vec2 h; bool hit=false;
  for(int i=0;i<140;i++){
    vec3 p=ro+rd*t; h=map(p);
    if(h.y<.5 && h.x<minD){minD=h.x;minP=p;}
    if(h.x<.0008){hit=true;break;}
    t+=h.x*.85; if(t>8.)break;
  }
  if(!hit){
    // peluş: kenarda tüy saçakları
    if(uFur>0. && minD<.07){
      float s=noise(minP*80.)*.7+noise(minP*160.)*.3;
      float a=smoothstep(.07,0.,minD)*smoothstep(.35,.75,s);
      vec3 n=normalize(vec3(minP.xy,.2));
      gl_FragColor=vec4(shade(minP,n,0.)*a,a);
      return;
    }
    gl_FragColor=vec4(0.); return;
  }
  vec3 p=ro+rd*t, n=nrm(p);
  vec3 col=shade(p,n,h.y);
  gl_FragColor=vec4(pow(col,vec3(.97)),1.);
}
