-- Expose the reward history to the holder of a public loyalty-card token.
-- The function remains SECURITY DEFINER so customers do not need direct SELECT
-- access to the rewards table (which is intentionally restricted to venue staff).
DROP FUNCTION IF EXISTS public.get_card(uuid);

CREATE FUNCTION public.get_card(_token uuid)
RETURNS TABLE(
  customer_name text,
  stamps integer,
  rewards_count integer,
  venue_name text,
  stamps_required integer,
  created_at timestamptz,
  card_primary_color text,
  card_secondary_color text,
  card_logo_url text,
  card_tagline text,
  card_stamp_icon text,
  rewards_history jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.customer_name,
    c.stamps,
    c.rewards_count,
    v.name,
    v.stamps_required,
    c.created_at,
    v.card_primary_color,
    v.card_secondary_color,
    v.card_logo_url,
    v.card_tagline,
    v.card_stamp_icon,
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'kind', r.kind,
          'description', r.description,
          'created_at', r.created_at
        )
        ORDER BY r.created_at DESC
      )
      FROM public.rewards r
      WHERE r.card_id = c.id
    ), '[]'::jsonb)
  FROM public.cards c
  JOIN public.venues v ON v.id = c.venue_id
  WHERE c.token = _token;
$$;

REVOKE ALL ON FUNCTION public.get_card(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_card(uuid) TO anon, authenticated;
