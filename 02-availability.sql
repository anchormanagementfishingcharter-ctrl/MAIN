-- Run after 00-schema.sql. How many of each package can still be booked for a date range.
-- Uses the same rules as reserve_booking, so the calendar and the final check always agree.
create or replace function product_availability(p_start date, p_end date)
returns table (product_id text, available int) language sql stable as $$
  select p.id,
    greatest(0, coalesce(min(floor((ii.qty - coalesce(u.used, 0))::numeric / pp.qty))::int, 0))
  from products p
  left join product_parts pp on pp.product_id = p.id
  left join inventory_items ii on ii.id = pp.item_id
  left join lateral (
    select sum(bi.qty * pp2.qty) as used
    from bookings b
    join booking_items bi on bi.booking_id = b.id
    join product_parts pp2 on pp2.product_id = bi.product_id and pp2.item_id = ii.id
    where b.start_date <= p_end and b.end_date >= p_start
      and (b.status = 'confirmed' or (b.status = 'pending' and b.expires_at > now()))
  ) u on true
  where p.active
  group by p.id
$$;
