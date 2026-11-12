CREATE OR REPLACE FUNCTION public.search_my_cards(_q text)
RETURNS TABLE(id uuid, token uuid, customer_name text, stamps integer, stamps_required integer, rewards_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE vid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Accedi'; END IF;
  SELECT v.id INTO vid FROM public.venues v WHERE v.owner_id = auth.uid();
  IF vid IS NULL THEN SELECT s.venue_id INTO vid FROM public.venue_staff s WHERE s.user_id = auth.uid() LIMIT 1; END IF;
  IF vid IS NULL THEN RAISE EXCEPTION 'Nessun locale'; END IF;
  RETURN QUERY SELECT c.id, c.token, c.customer_name, c.stamps, v.stamps_required, c.rewards_count
  FROM public.cards c JOIN public.venues v ON v.id = c.venue_id
  WHERE c.venue_id = vid AND (coalesce(trim(_q),'') = '' OR c.customer_name ILIKE '%' || trim(_q) || '%')
  ORDER BY c.last_stamp_at DESC NULLS LAST LIMIT 30;
END $$;

CREATE OR REPLACE FUNCTION public.admin_venue_staff(_venue uuid)
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accesso riservato'; END IF;
  RETURN QUERY SELECT s.id, s.email FROM public.venue_staff s WHERE s.venue_id = _venue ORDER BY s.created_at;
END $$;

CREATE OR REPLACE FUNCTION public.admin_add_staff(_venue uuid, _email text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accesso riservato'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.venues WHERE id = _venue) THEN RAISE EXCEPTION 'Locale non trovato'; END IF;
  SELECT au.id INTO u FROM auth.users au WHERE lower(au.email) = lower(trim(_email));
  IF u IS NULL THEN RAISE EXCEPTION 'Nessun account con questa email: il collaboratore deve prima registrarsi'; END IF;
  IF EXISTS (SELECT 1 FROM public.venues WHERE owner_id = u) THEN RAISE EXCEPTION 'Questo account è titolare di un locale'; END IF;
  IF EXISTS (SELECT 1 FROM public.venue_staff WHERE user_id = u) THEN RAISE EXCEPTION 'Questo account collabora già con un locale'; END IF;
  INSERT INTO public.venue_staff(venue_id, user_id, email) VALUES (_venue, u, lower(trim(_email)));
END $$;

CREATE OR REPLACE FUNCTION public.admin_remove_staff(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accesso riservato'; END IF;
  DELETE FROM public.venue_staff WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_venue(_venue uuid, _name text, _stamps_required integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accesso riservato'; END IF;
  IF length(trim(coalesce(_name,''))) < 1 OR length(_name) > 60 THEN RAISE EXCEPTION 'Nome non valido'; END IF;
  IF _stamps_required IS NULL OR _stamps_required < 1 OR _stamps_required > 30 THEN RAISE EXCEPTION 'Timbri tra 1 e 30'; END IF;
  UPDATE public.venues SET name = trim(_name), stamps_required = _stamps_required WHERE id = _venue;
END $$;

REVOKE ALL ON FUNCTION public.search_my_cards(text), public.admin_venue_staff(uuid), public.admin_add_staff(uuid,text), public.admin_remove_staff(uuid), public.admin_update_venue(uuid,text,integer), public.add_staff(text), public.remove_staff(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_my_cards(text), public.admin_venue_staff(uuid), public.admin_add_staff(uuid,text), public.admin_remove_staff(uuid), public.admin_update_venue(uuid,text,integer) TO authenticated;