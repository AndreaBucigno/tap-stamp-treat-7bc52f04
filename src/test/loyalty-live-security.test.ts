// @vitest-environment node
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { describe, it, expect } from "vitest";

const url = process.env['SUPABASE_URL'];
const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
const secret = process.env['SUPABASE_SERVICE_ROLE_KEY'];

describe.skipIf(!url || !key || !secret)("Live isolated security and loyalty", () => {
  it("isolates venues, restricts admin actions, and atomically resets rewards", async () => {
    if (!url || !key || !secret) return;
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const ids: string[] = [];
    const venues: string[] = [];
    const tag = randomUUID();
    const password = `T!${randomUUID()}a9`;
    try {
      const clients: ReturnType<typeof createClient>[] = [];
      for (let i = 0; i < 3; i++) {
        const email = `audit-${tag}-${i}@example.com`;
        const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        expect(created.error).toBeNull();
        const id = created.data.user?.id;
        if (!id) throw new Error("Test account missing");
        ids.push(id);
        const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
        expect((await client.auth.signInWithPassword({ email, password })).error).toBeNull();
        clients.push(client);
      }
      const owner = clients[0];
      const other = clients[1];
      const staff = clients[2];
      const ownerId = ids[0];
      const otherId = ids[1];
      const staffId = ids[2];
      if (!owner || !other || !staff || !ownerId || !otherId || !staffId) {
        throw new Error("Test accounts or clients missing");
      }
      expect((await owner.from("venues").insert({ owner_id: ownerId, name: "Unauthorized audit", slug: tag })).error).not.toBeNull();
      expect((await admin.from("manager_access").insert([{ user_id: ownerId }, { user_id: otherId }])).error).toBeNull();
      for (let i = 0; i < 2; i++) {
        const client = clients[i];
        const userId = i === 0 ? ownerId : otherId;
        if (!client) throw new Error("Test client missing");
        const v = await client.from("venues").insert({ owner_id: userId, name: `Audit ${i}`, slug: `${tag}-${i}`, stamps_required: 1 }).select("id").single();
        expect(v.error).toBeNull();
        if (!v.data?.id) throw new Error("Test venue was not created");
        venues.push(v.data.id);
      }
      const ownerVenueId = venues[0];
      const otherVenueId = venues[1];
      if (!ownerVenueId || !otherVenueId) throw new Error("Test venues missing");
      expect((await owner.from("venues").select("id").eq("id", otherVenueId)).data).toEqual([]);
      expect((await owner.from("venues").update({ name: "Unauthorized" }).eq("id", otherVenueId).select("id")).data).toEqual([]);
      expect((await owner.rpc("admin_venues")).error).not.toBeNull();
      expect((await staff.rpc("admin_add_staff", { _venue: venues[0], _email: "invalid@example.com" })).error).not.toBeNull();
      expect((await admin.from("venue_staff").insert({ venue_id: ownerVenueId, user_id: staffId, email: `audit-${tag}-2@example.com` })).error).toBeNull();
      const publicClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const joined = await publicClient.rpc("join_venue", { _slug: `${tag}-0`, _name: "Cliente audit" });
      expect(joined.error).toBeNull();
      const token = joined.data;
      if (!token) throw new Error("Customer card token was not created");
      expect((await publicClient.rpc("add_stamp", { _token: token })).error).not.toBeNull();
      expect((await other.rpc("add_stamp", { _token: token })).error).not.toBeNull();
      expect((await staff.rpc("add_stamp", { _token: token })).error).toBeNull();
      expect((await owner.rpc("add_stamp", { _token: token })).error).not.toBeNull();
      const redeem = () => owner.rpc("redeem_reward", { _token: token, _kind: "gift", _description: "Premio audit" });
      const redeemed = await Promise.all([redeem(), redeem()]);
      expect(redeemed.filter(r => !r.error)).toHaveLength(1);
      const card = await admin.from("cards").select("id,stamps,last_stamp_at,rewards_count").eq("token", token).single();
      expect(card.data.stamps).toBe(0);
      expect(card.data.last_stamp_at).toBeNull();
      expect(card.data.rewards_count).toBe(1);
      expect((await admin.from("rewards").select("id").eq("card_id", card.data.id)).data).toHaveLength(1);
      expect((await owner.rpc("add_stamp", { _token: token })).error).toBeNull();
      const secondCard = await publicClient.rpc("join_venue", { _slug: `${tag}-1`, _name: "Altro cliente audit" });
      expect((await staff.rpc("add_stamp", { _token: secondCard.data })).error).not.toBeNull();
      expect((await staff.rpc("remove_staff", { _id: randomUUID() })).error).not.toBeNull();
      // A two-stamp card verifies the cooldown independently of completion.
      expect((await admin.from("venues").update({ stamps_required: 2 }).eq("id", otherVenueId)).error).toBeNull();
      const secondToken = secondCard.data;
      if (!secondToken) throw new Error("Second customer card token was not created");
      const stamps = await Promise.all([other.rpc("add_stamp", { _token: secondToken }), other.rpc("add_stamp", { _token: secondToken })]);
      expect(stamps.filter(r => !r.error)).toHaveLength(1);
      const secondCardDetails = await publicClient.rpc("get_card", { _token: secondToken });
      expect(secondCardDetails.data?.[0]?.stamps).toBe(1);
      console.log("Verified: email login, unauthorized venue denied, isolation, staff scope, cooldown, atomic reward and immediate new stamp.");
    } finally {
      for (const id of venues) await admin.from("venues").delete().eq("id", id);
      for (const id of ids) {
        await admin.from("manager_access").delete().eq("user_id", id);
        await admin.auth.admin.deleteUser(id);
      }
    }
  }, 120000);
});