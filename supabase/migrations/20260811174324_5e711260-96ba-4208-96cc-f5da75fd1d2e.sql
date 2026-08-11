CREATE TABLE public.creations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  tool_label TEXT NOT NULL,
  kind TEXT NOT NULL,
  prompt TEXT,
  output_text TEXT,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creations TO authenticated;
GRANT ALL ON public.creations TO service_role;

ALTER TABLE public.creations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own creations"
  ON public.creations FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all creations"
  ON public.creations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX creations_user_created_idx ON public.creations (user_id, created_at DESC);

CREATE POLICY "Users read own creation files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'creations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own creation files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'creations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own creation files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'creations' AND auth.uid()::text = (storage.foldername(name))[1]);