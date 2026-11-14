CREATE OR REPLACE FUNCTION public.redeem_reward(_token uuid, _kind text, _description text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE c public.cards; v public.venues; amount numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Accedi come titolare'; END IF;
 IF _kind IS NULL OR _kind NOT IN ('gift','discount') THEN RAISE EXCEPTION 'Tipo non valido'; END IF;
 IF length(trim(coalesce(_description,''))) < 1 OR length(_description)>500 THEN RAISE EXCEPTION 'Descrivi il premio (massimo 500 caratteri)'; END IF;
 IF _kind='discount' THEN
  IF _description !~ '^Sconto del [0-9]+([.][0-9]+)?%$' THEN RAISE EXCEPTION 'Percentuale non valida'; END IF;
  amount := substring(_description FROM '[0-9]+(?:[.][0-9]+)?')::numeric;
  IF amount IS NULL OR amount < 1 OR amount > 100 THEN RAISE EXCEPTION 'Percentuale tra 1 e 100'; END IF;
 END IF;
 SELECT * INTO c FROM public.cards WHERE token=_token FOR UPDATE;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Carta non trovata'; END IF;
 SELECT * INTO v FROM public.venues WHERE id=c.venue_id;
 IF NOT public.can_operate(v.id) THEN RAISE EXCEPTION 'Questa carta appartiene a un altro locale'; END IF;
 IF c.stamps<v.stamps_required THEN RAISE EXCEPTION 'Il cliente non ha ancora raggiunto i timbri necessari'; END IF;
 INSERT INTO public.rewards(card_id,venue_id,kind,description) VALUES(c.id,v.id,_kind,trim(_description));
 UPDATE public.cards SET stamps=0,last_stamp_at=NULL,rewards_count=cards.rewards_count+1 WHERE id=c.id;
END $function$;
REVOKE ALL ON FUNCTION public.redeem_reward(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid,text,text) TO authenticated, service_role;