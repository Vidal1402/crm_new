// A chave anon é pública por desenho: o bundle de produção já a carrega.
// Este endpoint existe para o CRM Espelho, quando o build estático saiu sem
// SUPABASE_URL/ANON_KEY mas o runtime da Vercel tem as variáveis. Sem isso o
// app abre o wizard de bootstrap em vez do login.

type ApiRequest = { method?: string };

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  end: () => void;
};

export default function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method && req.method !== 'GET') return res.status(405).end();
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !anonKey) return res.status(503).json({ url: '', anonKey: '' });
  return res.status(200).json({ url, anonKey });
}
