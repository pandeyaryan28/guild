import { useEffect, useRef } from 'react';

interface Node3D {
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  label?: string;
  type?: 'task' | 'chat' | 'approval' | 'file';
}

export function CosmicCanvas3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth * window.devicePixelRatio);
    let height = (canvas.height = canvas.offsetHeight * window.devicePixelRatio);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };

    window.addEventListener('resize', handleResize);

    // Create 3D nodes
    const labels = [
      { text: 'Task #104', type: 'task' },
      { text: 'Marketing Channel', type: 'chat' },
      { text: 'Leave Approved', type: 'approval' },
      { text: 'Invoice.pdf', type: 'file' },
      { text: 'Kanban Board', type: 'task' },
      { text: '#ops-coordination', type: 'chat' },
      { text: 'Expense Request', type: 'approval' },
      { text: 'Contract.docx', type: 'file' },
      { text: 'Priority H', type: 'task' },
      { text: 'DM: Sarah', type: 'chat' },
    ];

    const nodes: Node3D[] = [];
    const colors = {
      task: '#6366f1', // Indigo
      chat: '#06b6d4', // Teal
      approval: '#a855f7', // Purple
      file: '#ec4899', // Pink
    };

    // Initialize nodes with random 3D positions
    for (let i = 0; i < 24; i++) {
      const type = ['task', 'chat', 'approval', 'file'][Math.floor(Math.random() * 4)] as 'task' | 'chat' | 'approval' | 'file';
      const hasLabel = Math.random() > 0.4 && nodes.filter(n => n.label).length < 8;
      const labelObj = hasLabel ? labels[nodes.filter(n => n.label).length % labels.length] : undefined;

      nodes.push({
        x: (Math.random() - 0.5) * 600,
        y: (Math.random() - 0.5) * 600,
        z: (Math.random() - 0.5) * 600,
        radius: Math.random() * 4 + 3,
        color: colors[type],
        label: labelObj?.text,
        type: type,
      });
    }

    // Interactive mouse movement tracker
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      mouseRef.current.targetX = x * 0.4;
      mouseRef.current.targetY = y * 0.4;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Rotation angles
    let angleY = 0.0015;
    let angleX = 0.0008;

    const FOV = 400; // Field of view / perspective factor

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const centerX = width / 2;
      const centerY = height / 2;

      // Rotation matrix values
      const cosY = Math.cos(angleY + mouseRef.current.x * 0.00002);
      const sinY = Math.sin(angleY + mouseRef.current.x * 0.00002);
      const cosX = Math.cos(angleX + mouseRef.current.y * 0.00002);
      const sinX = Math.sin(angleX + mouseRef.current.y * 0.00002);

      // 1. Rotate nodes and project them
      const projectedNodes = nodes.map((node) => {
        // Rotate around Y axis
        let x1 = node.x * cosY - node.z * sinY;
        let z1 = node.z * cosY + node.x * sinY;

        // Rotate around X axis
        let y2 = node.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + node.y * sinX;

        // Save rotated coordinates
        node.x = x1;
        node.y = y2;
        node.z = z2;

        // Perspective projection calculation
        // Push object away on Z axis to prevent division by zero
        const scale = FOV / (FOV + z2 + 300);
        const projX = centerX + x1 * scale;
        const projY = centerY + y2 * scale;

        return {
          projX,
          projY,
          scale,
          z: z2,
          color: node.color,
          radius: node.radius * scale * 1.5,
          label: node.label,
        };
      });

      // 2. Draw connections (lines) between close nodes
      ctx.lineWidth = 1;
      for (let i = 0; i < projectedNodes.length; i++) {
        for (let j = i + 1; j < projectedNodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];

          // Compute 3D distance
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dz = n1.z - n2.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 220) {
            const opacity = (1 - dist / 220) * 0.15;
            const grad = ctx.createLinearGradient(
              projectedNodes[i].projX,
              projectedNodes[i].projY,
              projectedNodes[j].projX,
              projectedNodes[j].projY
            );
            grad.addColorStop(0, projectedNodes[i].color + Math.round(opacity * 255).toString(16).padStart(2, '0'));
            grad.addColorStop(1, projectedNodes[j].color + Math.round(opacity * 255).toString(16).padStart(2, '0'));

            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(projectedNodes[i].projX, projectedNodes[i].projY);
            ctx.lineTo(projectedNodes[j].projX, projectedNodes[j].projY);
            ctx.stroke();
          }
        }
      }

      // 3. Draw nodes (dots and text) sorted by depth Z so distant nodes are drawn first
      projectedNodes
        .sort((a, b) => b.z - a.z)
        .forEach((node) => {
          if (node.projX < 0 || node.projX > width || node.projY < 0 || node.projY > height) return;

          // Node circle
          ctx.beginPath();
          ctx.arc(node.projX, node.projY, node.radius, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.fill();

          // Node glow effect for closer items
          if (node.scale > 0.8) {
            ctx.beginPath();
            ctx.arc(node.projX, node.projY, node.radius * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = node.color + '1a'; // 10% opacity
            ctx.fill();
          }

          // Labels
          if (node.label && node.scale > 0.65) {
            ctx.font = `${Math.max(10, Math.round(11 * node.scale))}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = `rgba(15, 23, 42, ${Math.min(1, (node.scale - 0.5) * 2)})`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            // Draw a subtle pill background behind label
            const textWidth = ctx.measureText(node.label).width;
            const paddingX = 6 * node.scale;
            const paddingY = 3 * node.scale;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.85, (node.scale - 0.5) * 2)})`;
            ctx.beginPath();
            ctx.roundRect(
              node.projX + node.radius + 6,
              node.projY - paddingY - 5,
              textWidth + paddingX * 2,
              (11 * node.scale) + paddingY * 2,
              4
            );
            ctx.fill();
            
            // Border
            ctx.strokeStyle = `rgba(99, 102, 241, ${Math.min(0.12, (node.scale - 0.5) * 2)})`;
            ctx.lineWidth = 1;
            ctx.stroke();

            // Text
            ctx.fillStyle = `rgba(15, 23, 42, ${Math.min(0.8, (node.scale - 0.5) * 2)})`;
            ctx.fillText(node.label, node.projX + node.radius + 6 + paddingX, node.projY + 1);
          }
        });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none opacity-80"
      style={{ mixBlendMode: 'multiply' }}
    />
  );
}
