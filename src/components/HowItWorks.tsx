export default function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Paste URL',
      desc: 'Paste the webpage URL containing the video you want to inspect.',
      icon: '📋'
    },
    {
      num: '02',
      title: 'Extract',
      desc: 'Our Cloudflare Worker fetches the page and searches for publicly exposed media sources.',
      icon: '🔍'
    },
    {
      num: '03',
      title: 'Watch or Download',
      desc: 'Preview the stream, copy the media URL, or use FFmpeg for local download.',
      icon: '▶️'
    }
  ];

  return (
    <section id="how-it-works" className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">
          <span className="gradient-text">How It Works</span>
        </h2>
        <p className="text-gray-400 text-sm md:text-base">Three simple steps to extract public video sources.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step) => (
          <div key={step.num} className="glass-card p-6 text-center hover:border-indigo-500/30 transition-all">
            <div className="text-4xl mb-4">{step.icon}</div>
            <div className="text-xs text-indigo-400 font-mono mb-2">{step.num}</div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">{step.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
