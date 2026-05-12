// R.O.B. Concepting — WhatsApp redirect proxy
// Vereiste env var in Netlify: WHATSAPP_NUMBER (formaat: 31612345678, zonder + of 00)
// Houdt het telefoonnummer uit de publieke HTML/JS — alleen op de server.

exports.handler = async () => {
  const num = (process.env.WHATSAPP_NUMBER || '').replace(/[^0-9]/g, '');
  if (!num) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: 'WhatsApp tijdelijk niet beschikbaar. Mail naar contact@rob-concepting.com.'
    };
  }

  const text = encodeURIComponent('Hoi Rob, ik kom van rob-concepting.com en wil even sparren over ');
  const url  = `https://wa.me/${num}?text=${text}`;

  return {
    statusCode: 302,
    headers: {
      Location: url,
      'Cache-Control': 'no-store'
    },
    body: ''
  };
};
