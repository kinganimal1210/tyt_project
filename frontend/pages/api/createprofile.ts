import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 서비스 롤 키
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, name, email, department, year } = req.body;

  const { error } = await supabase.from('profiles').insert([{ id, name, email, department, year }]);

  if (error) return res.status(400).json({ error: error.message });

  res.status(200).json({ message: '프로필 저장 완료' });
}
