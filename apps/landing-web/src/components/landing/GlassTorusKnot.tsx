import { useEffect, useRef, useMemo } from 'react';

export function GlassTorusKnot() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const rotation = useRef({ x: 0, y: 0, z: 0 });

  // Precompute 3D points for a trefoil torus knot (p=2, q=3)
  const basePoints = useMemo(() => {
    const pts = [];
    const N = 350; // Number of overlapping spheres along the knot curve
    for (let i = 0; i < N; i++) {
      const t = (i / N) * Math.PI * 2;
      
      // Trefoil Torus Knot Parametric Equations
      const cosQt = Math.cos(3 * t);
      const sinQt = Math.sin(3 * t);
      const cosPt = Math.cos(2 * t);
      const sinPt = Math.sin(2 * t);
      
      const R_major = 105; // Major radius
      const r_minor = 40;  // Minor radius
      
      const r = R_major + r_minor * cosQt;
      const x = r * cosPt;
      const y = r * sinPt;
      const z = r_minor * sinQt;
      
      pts.push({ x, y, z });
    }
    return pts;
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse positions between -0.5 and 0.5 relative to screen center
      mouse.current.targetX = (e.clientX / window.innerWidth) - 0.5;
      mouse.current.targetY = (e.clientY / window.innerHeight) - 0.5;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId: number;
    let isMounted = true;

    const resizeCanvas = () => {
      if (!canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    // Initialize size and listen to resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      if (!isMounted || !canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const centerX = width / 2;
      const centerY = height / 2;

      // Clear with transparent background
      ctx.clearRect(0, 0, width, height);

      // Smooth interpolation for mouse movements (spring physics effect)
      mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.06;
      mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.06;

      // Auto-rotation angles combined with mouse hover tilt
      rotation.current.x += 0.003;
      rotation.current.y += 0.004;
      rotation.current.z += 0.002;

      // Final angles combining auto-spin and cursor-driven tilt
      const rotX = rotation.current.x + mouse.current.y * 0.6;
      const rotY = rotation.current.y + mouse.current.x * 0.6;
      const rotZ = rotation.current.z;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosZ = Math.cos(rotZ);
      const sinZ = Math.sin(rotZ);

      // Rotate and project all points
      const cameraDistance = 350;
      const focusLength = 350;

      const projected = basePoints.map((pt) => {
        // Rotate around X axis
        const xy = pt.y * cosX - pt.z * sinX;
        const xz = pt.y * sinX + pt.z * cosX;
        const xx = pt.x;

        // Rotate around Y axis
        const yx = xx * cosY + xz * sinY;
        const yz = -xx * sinY + xz * cosY;
        const yy = xy;

        // Rotate around Z axis
        const rx = yx * cosZ - yy * sinZ;
        const ry = yx * sinZ + yy * cosZ;
        const rz = yz;

        // Project
        const scale = focusLength / (focusLength + rz + cameraDistance);
        const px = centerX + rx * scale;
        const py = centerY + ry * scale;

        return { px, py, rz, scale };
      });

      // Sort points from back to front (Painter's Algorithm for depth buffer)
      projected.sort((a, b) => b.rz - a.rz);

      // 1. Draw a soft, diffuse 3D drop shadow first
      ctx.fillStyle = 'rgba(15, 23, 42, 0.012)'; // Soft translucent dark shadow
      for (let i = 0; i < projected.length; i++) {
        const pt = projected[i];
        const shadowOffsetDist = 12 * pt.scale;
        const shadowRadius = 22 * pt.scale;
        ctx.beginPath();
        ctx.arc(
          pt.px + shadowOffsetDist, 
          pt.py + shadowOffsetDist + 5, 
          shadowRadius, 
          0, 
          Math.PI * 2
        );
        ctx.fill();
      }

      // 2. Draw the volumetric glass torus knot
      for (let i = 0; i < projected.length; i++) {
        const pt = projected[i];
        const beadRadius = 16 * pt.scale;

        // Create volumetric glass specular/diffuse gradient
        // Light source is simulated from top-left (offset center)
        const gradient = ctx.createRadialGradient(
          pt.px - beadRadius * 0.25,
          pt.py - beadRadius * 0.25,
          beadRadius * 0.05,
          pt.px,
          pt.py,
          beadRadius
        );

        // Glassmorphic color palette with specs of indigo, purple, and cyan
        // High opacity highlights, translucent body, fading glow edges
        gradient.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)'); // Specular highlight
        gradient.addColorStop(0.2, 'rgba(168, 85, 247, 0.3)');   // Purple reflection
        gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.18)');  // Indigo body
        gradient.addColorStop(0.85, 'rgba(6, 182, 212, 0.1)');   // Cyan refraction rim
        gradient.addColorStop(1.0, 'rgba(6, 182, 212, 0.0)');    // Outer edge glow

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pt.px, pt.py, beadRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [basePoints]);

  return (
    <div className="w-full h-full relative flex items-center justify-center pointer-events-none">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />
    </div>
  );
}
