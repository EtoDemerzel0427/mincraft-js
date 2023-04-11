export const blankCubeVSText = `
    precision mediump float;

    uniform vec4 uLightPos;    
    uniform vec3 lightColor;
    uniform vec3 ambientColor;
    uniform mat4 uView;
    uniform mat4 uProj;
    
    attribute vec4 aNorm;
    attribute vec4 aVertPos;
    attribute vec4 aOffset;
    attribute vec2 aUV;
    attribute float blockType;
    attribute float inSeed;
    
    varying vec4 normal;
    varying vec4 wsPos;
    varying vec2 uv;
    varying float seed;
    varying float cubeType;

    void main () {

        gl_Position = uProj * uView * (aVertPos + aOffset);
        wsPos = aVertPos + aOffset;
        normal = normalize(aNorm);
        uv = aUV;

        // set seed, every vertex in the same cube has the same aOffset,
        // so vertices within the same cube has the same seed.
        seed = aOffset.x*2.0 + aOffset.y*4.0 + aOffset.z*8.0 + inSeed;
        cubeType = blockType;
    }
`;
export const blankCubeFSText = `
    precision mediump float;

    uniform vec4 uLightPos;
    uniform vec3 lightColor;
    uniform vec3 ambientColor;
    
    varying vec4 normal;
    varying vec4 wsPos;
    varying vec2 uv;
    varying float seed;
    varying float cubeType;

    float random (in vec2 pt, in float seed) {
        return fract(sin( (seed + dot(pt.xy, vec2(12.9898,78.233))))*43758.5453123);
    }

    vec2 unit_vec(in vec2 xy, in float seed) {
        float theta = 6.28318530718*random(xy, seed);
        return vec2(cos(theta), sin(theta));
    }

    float smoothmix (float lo, float hi, float t) {
        return (hi - lo) * (3.0 - t * 2.0) * t * t + lo;
    }

    float getDot(float cx, float cy, float x, float y, float seed){
        //generate random vector for corner point
        vec2 random_vec = unit_vec(vec2(cx,cy),seed);

        //vector, from corner to (x,y)
        vec2 d = vec2(x-cx,y-cy); 

        //return the dot
        return dot(d,random_vec);
    }

    float perlin(float x, float y,float seed) {
        float x0 = floor(x);
        float y0 = floor(y);
        float x1 = floor(x)+1.0;
        float y1 = floor(y)+1.0;

        float h0, h1, i0, i1, value;
        float u = x - x0;
        float v = y - y0;
         
        h0 = getDot(x0, y0, x, y,seed);
        h1 = getDot(x1, y0, x, y,seed);
        i0 = smoothmix(h0, h1, u);
         
        h0 = getDot(x0, y1, x, y,seed);
        h1 = getDot(x1, y1, x, y,seed);
        i1 = smoothmix(h0, h1, u);
         
        value = smoothmix(i0, i1, v);
        return value*0.5+0.5; 
    }

    float perlin_texture(float x, float y, float size, float seed){
        x *= size;
        y *= size;
        float res = 0.0;
        float zoom_size = size;

        //TODO: Amazing, cannot use while-loop, don't know why
        // while(zoom_size>=1.0){
        //     res += perlin(x /zoom_size, y / zoom_size,seed) * zoom_size;
        //     zoom_size/=2.0;
        // }

        res += perlin(x /zoom_size, y / zoom_size,seed) * zoom_size;
        zoom_size/=2.0;
        res += perlin(x /zoom_size, y / zoom_size,seed) * zoom_size;
        zoom_size/=2.0;
        res += perlin(x /zoom_size, y / zoom_size,seed) * zoom_size;
        zoom_size/=2.0;
        res += perlin(x /zoom_size, y / zoom_size,seed) * zoom_size;
        zoom_size/=2.0;
        res += perlin(x /zoom_size, y / zoom_size,seed) * zoom_size;
        zoom_size/=2.0;

        return res/size;
    }

    float marble_texture(vec2 uv,float p,float a){ 
        return (sin((uv.x*3.0+uv.y*3.0+a*p)*2.0*3.1415))*0.5+0.8;
    }

    float circle_texture(vec2 uv,float p){ 
        return (sin(sqrt((uv.x*5.0-2.5)*(uv.x*5.0-2.5)+(uv.y*5.0-2.5)*(uv.y*5.0-2.5)+5.0*p)*2.0*3.1415))*0.5+0.8;
    }

    void main() {
        vec3 kd = lightColor;
        vec3 ka = ambientColor;
        float size  = 32.0; // smaller, faster

        /* Compute light fall off */
        vec4 lightDirection = uLightPos - wsPos;
        float dot_nl = dot(normalize(lightDirection), normalize(normal));
	    dot_nl = clamp(dot_nl, 0.0, 1.0);
        
        float p = perlin_texture(uv.x, uv.y, size, seed);
        vec3 pv;

        if(cubeType==0.0){                                        //grass
            p = clamp(p,0.8,1.0);
            if(normal.x==0.0 && normal.z==0.0) {pv = vec3(0.13, 0.545*p, 0.13);}
            else {pv = vec3(0.61*p, 0.29, 0.07);}
        }else if(cubeType==1.0){                                 //marble place
            p =  marble_texture(uv,p,5.0);
            pv = vec3(0.95*p,0.95*p,0.95*p);
        }else if(cubeType==2.0){                                 //creek
            p = marble_texture(uv,p,1.2);
            pv= vec3(0.1176*p,0.565*p,1.0*p);
        }else if(cubeType==3.0){                                 //snow cover
            p =  clamp(p+0.1,0.0,1.0);
            pv= vec3(0.94*p,p,p);
        }else if(cubeType==4.0){                                 //stone in creek
            if(normal.x==0.0 && normal.z==0.0)
            {p = circle_texture(uv,p);pv = vec3(0.82*p, 0.70*p, 0.55*p);}
            else 
            {p = marble_texture(uv,p,1.2); pv= vec3(0.1176*p,0.565*p,1.0*p);}
        }
        ka = ka*pv;
        gl_FragColor = vec4(clamp(ka+clamp(dot_nl * kd* pv, 0.0, 1.0),0.0, 1.0),1.0);
    }
`;
export const grassVSText = `
    precision mediump float;

    uniform vec4 uLightPos;    
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform vec3 lightColor;
    uniform vec3 ambientColor;
    
    attribute vec4 aNorm;
    attribute vec4 aVertPos;
    attribute vec4 aOffset;
    
    varying vec4 normal;
    varying vec4 wsPos;

    void main () {
        gl_Position = uProj * uView * (aVertPos + aOffset);
        wsPos = aVertPos + aOffset;
        normal = normalize(aNorm);
    }
`;
export const grassFSText = `
    precision mediump float;

    uniform vec4 uLightPos;
    
    varying vec4 normal;
    varying vec4 wsPos;
    uniform vec3 lightColor;
    uniform vec3 ambientColor;
    
    void main() {
        vec3 kd = lightColor;
        vec3 ka = ambientColor;
        vec3 c = vec3(0.500,0.89,0.184);
        /* Compute light fall off */
        vec4 lightDirection = uLightPos - wsPos;
        float dot_nl = dot(normalize(lightDirection), normalize(normal));
	    dot_nl = clamp(dot_nl, 0.0, 1.0);
        if(dot_nl>=0.9){
            dot_nl-=0.5;
        }
        ka = ka*c;
        gl_FragColor = vec4(clamp(ka+clamp(dot_nl * kd*c, 0.0, 1.0),0.0, 1.0),1.0);
    }
`;
export const rockVSText = `
    precision mediump float;

    uniform vec4 uLightPos;    
    uniform mat4 uView;
    uniform mat4 uProj;
    uniform vec3 lightColor;
    uniform vec3 ambientColor;
    
    attribute vec4 aNorm;
    attribute vec4 aVertPos;
    attribute vec4 aOffset;
    
    varying vec4 normal;
    varying vec4 wsPos;

    void main () {
        gl_Position = uProj * uView * (aVertPos + aOffset);
        wsPos = aVertPos + aOffset;
        normal = normalize(aNorm);
    }
`;
export const rockFSText = `
    precision mediump float;

    uniform vec4 uLightPos;
    
    varying vec4 normal;
    varying vec4 wsPos;
    uniform vec3 lightColor;
    uniform vec3 ambientColor;
    
    void main() {
        vec3 kd = lightColor;
        vec3 ka = ambientColor;
        vec3 c = vec3(0.8,0.52,0.25);
        /* Compute light fall off */
        vec4 lightDirection = uLightPos - wsPos;
        float dot_nl = dot(normalize(lightDirection), normalize(normal));
	    dot_nl = clamp(dot_nl, 0.0, 1.0);
        if(dot_nl>=0.9){
            dot_nl-=0.5;
        }
        ka = ka*c;
        gl_FragColor = vec4(clamp(ka+clamp(dot_nl * kd*c, 0.0, 1.0),0.0, 1.0),1.0);
    }
`;
//# sourceMappingURL=Shaders.js.map