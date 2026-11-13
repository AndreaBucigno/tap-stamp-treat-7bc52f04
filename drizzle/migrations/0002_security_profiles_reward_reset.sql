CREATE TABLE public.manager_access (user_id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.manager_access TO authenticated;
GRANT ALL ON public.manager_access TO service_role;
ALTER TABLE public.manager_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own manager access" ON public.manager_access FOR SELECT TO authenticated USING (user_id = auth.uid());
INSERT INTO public.manager_access(user_id) SELECT owner_id FROM public.venues UNION SELECT user_id FROM public.user_roles WHERE role='admin';
CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, display_name text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING(id=auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING(id=auth.uid()) WITH CHECK(id=auth.uid());
INSERT INTO public.profiles(id,display_name) SELECT id,left(coalesce(raw_user_meta_data->>'full_name',''),80) FROM auth.users;
CREATE OR REPLACE FUNCTION public.handle_account_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO public.profiles(id,display_name) VALUES(NEW.id,left(coalesce(NEW.raw_user_meta_data->>'full_name',''),80)) ON CONFLICT(id) DO NOTHING;
 IF NEW.invited_at IS NOT NULL THEN INSERT INTO public.manager_access(user_id) VALUES(NEW.id) ON CONFLICT(user_id) DO NOTHING; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_account_profile() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER account_profile_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_account_profile();
CREATE TRIGGER account_invitation_updated AFTER UPDATE OF invited_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_account_profile();
CREATE POLICY "authorized manager creates venue" ON public.venues AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (EXISTS(SELECT 1 FROM public.manager_access WHERE user_id=auth.uid()) AND NOT EXISTS(SELECT 1 FROM public.venue_staff WHERE user_id=auth.uid()) AND NOT public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.redeem_reward(_token uuid,_kind text,_description text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.cards; v public.venues; amount numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Accedi come titolare'; END IF;
 IF _kind IS NULL OR _kind NOT IN ('gift','discount') THEN RAISE EXCEPTION 'Tipo non valido'; END IF;
 IF length(trim(coalesce(_description,''))) < 1 OR length(_description)>500 THEN RAISE EXCEPTION 'Descrivi il premio (massimo 500 caratteri)'; END IF;
 IF _kind='discount' THEN
  IF _description !~ '^Sconto del [0-9]+([.][0-9]+)?%$' THEN RAISE EXCEPTION 'Percentuale non valida'; END IF;
  amount := substring(_description FROM '[0-9]+([.][0-9]+)?')::numeric;
  IF amount < 1 OR amount > 100 THEN RAISE EXCEPTION 'Percentuale tra 1 e 100'; END IF;
 END IF;
 SELECT * INTO c FROM public.cards WHERE token=_token FOR UPDATE;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Carta non trovata'; END IF;
 SELECT * INTO v FROM public.venues WHERE id=c.venue_id;
 IF NOT public.can_operate(v.id) THEN RAISE EXCEPTION 'Questa carta appartiene a un altro locale'; END IF;
 IF c.stamps<v.stamps_required THEN RAISE EXCEPTION 'Il cliente non ha ancora raggiunto i timbri necessari'; END IF;
 INSERT INTO public.rewards(card_id,venue_id,kind,description) VALUES(c.id,v.id,_kind,trim(_description));
 UPDATE public.cards SET stamps=0,last_stamp_at=NULL,rewards_count=cards.rewards_count+1 WHERE id=c.id;
END $$;
REVOKE ALL ON FUNCTION public.redeem_reward(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid,text,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_remove_staff(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accesso riservato'; END IF;
 DELETE FROM public.venue_staff WHERE id=_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Collaboratore non trovato'; END IF;
END $$;