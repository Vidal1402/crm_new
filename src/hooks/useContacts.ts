import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { useAppUser } from '@/app/providers/AppUserProvider';
import type { Contact, ContactWithTags, Tag } from '@/types/db';
import { cacheFresh, invalidateCache, peekCache, setCache } from '@/lib/queryCache';
import { monthRange, viewRange, type AccountTally, type AccountView } from '@/lib/accountBook';
import { filterStoryContacts, isStoryId, storyBook } from '@/lib/mock/story';

export type ContactSort = 'recent' | 'oldest' | 'name' | 'first_seen';

interface UseContactsInput {
  search?: string;
  tagId?: string | null;
  source?: string | null;
  book?: AccountView;
  sort?: ContactSort;
  page?: number;
  pageSize?: number;
}

interface UseContactsResult {
  contacts: ContactWithTags[];
  total: number;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  create: (
    input: Pick<Contact, 'phone'> & Partial<Pick<Contact, 'name' | 'email' | 'custom_fields'>> & { tag_ids?: string[] },
  ) => Promise<Contact | null>;
  update: (
    id: string,
    patch: Partial<Pick<Contact, 'name' | 'email' | 'phone' | 'custom_fields'>> & { tag_ids?: string[] },
  ) => Promise<void>;
  remove: (ids: string[]) => Promise<void>;
  assignTags: (contactIds: string[], tagIds: string[]) => Promise<void>;
}

const PAGE_SIZE_DEFAULT = 25;

function sampleContactPage(input: {
  search: string;
  source: string | null;
  book: AccountView;
  sort: ContactSort;
  page: number;
  pageSize: number;
  tagId?: string | null;
  live?: ContactWithTags[];
  liveTotal?: number;
}): { contacts: ContactWithTags[]; total: number } {
  const live = input.live ?? [];
  const liveTotal = input.liveTotal ?? live.length;
  if (input.tagId && !input.tagId.startsWith('story-tag-')) return { contacts: live, total: liveTotal };
  const sample = filterStoryContacts({
    search: input.search,
    source: input.source,
    book: input.book,
    sort: input.sort,
    page: 1,
    pageSize: 100,
  }).contacts.filter((contact) => !live.some((row) => row.id === contact.id));
  return {
    contacts: input.page === 1 ? [...sample, ...live] : live,
    total: liveTotal + sample.length,
  };
}

export function useContacts({
  search = '',
  tagId = null,
  source = null,
  book = 'all',
  sort = 'recent',
  page = 1,
  pageSize = PAGE_SIZE_DEFAULT,
}: UseContactsInput = {}): UseContactsResult {
  const { userId } = useAppUser();
  const cacheKey = `contacts:${userId ?? ''}:${search}:${tagId ?? ''}:${source ?? ''}:${book}:${sort}:${page}:${pageSize}`;
  const cached = peekCache<{ contacts: ContactWithTags[]; total: number }>(cacheKey);
  const [contacts, setContacts] = useState<ContactWithTags[]>(() => cached?.contacts ?? []);
  const [total, setTotal] = useState(() => cached?.total ?? 0);
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (opts?: { force?: boolean }) => {
    if (!userId) return;
    const key = `contacts:${userId}:${search}:${tagId ?? ''}:${source ?? ''}:${book}:${sort}:${page}:${pageSize}`;
    if (!opts?.force && cacheFresh(key)) {
      const hit = peekCache<{ contacts: ContactWithTags[]; total: number }>(key);
      if (hit) {
        setContacts(hit.contacts);
        setTotal(hit.total);
        setLoading(false);
        return;
      }
    }
    if (!peekCache(key)) setLoading(true);
    setError(null);
    const supabase = getSupabase();

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // When a tag filter is active, pre-filter contact_ids via contact_tags and
    // pass the list to the main query. A nested join would return too many
    // duplicated rows; two small queries is simpler and lets us paginate.
    let contactIdsForTag: string[] | null = null;
    if (tagId) {
      const { data: links, error: linksErr } = await supabase
        .from('contact_tags')
        .select('contact_id')
        .eq('tag_id', tagId);
      if (linksErr) {
        setError(linksErr.message);
        setLoading(false);
        return;
      }
      contactIdsForTag = (links ?? []).map((l) => l.contact_id as string);
      if (contactIdsForTag.length === 0) {
        setCache(key, { contacts: [], total: 0 });
        setContacts([]);
        setTotal(0);
        setLoading(false);
        return;
      }
    }

    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .range(from, to);

    // Ordenação (coluna "Primeiro registro" e nome também ordenáveis).
    if (sort === 'oldest') query = query.order('created_at', { ascending: true });
    else if (sort === 'name') query = query.order('name', { ascending: true, nullsFirst: false });
    else if (sort === 'first_seen') query = query.order('first_seen_at', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    if (contactIdsForTag) {
      query = query.in('id', contactIdsForTag);
    }

    if (source) {
      query = query.eq('source', source);
    }

    const range = viewRange(book, new Date());
    if (range.type === 'prospect') query = query.or('kind.is.null,kind.eq.lead');
    if (range.type === 'cliente') {
      query = query.eq('kind', 'cliente');
      if (range.from) query = query.gte('updated_at', range.from);
      if (range.to) query = query.lt('updated_at', range.to);
    }

    if (search.trim()) {
      const pattern = `%${search.trim()}%`;
      query = query.or(
        `name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern},custom_fields->>cnpj.ilike.${pattern}`,
      );
    }

    const { data, error: err, count } = await query;
    if (err) {
      const fallback = sampleContactPage({ search, source, book, sort, page, pageSize, tagId });
      if (fallback.contacts.length > 0) {
        setCache(key, fallback);
        setContacts(fallback.contacts);
        setTotal(fallback.total);
        setLoading(false);
        return;
      }
      setError(err.message);
      setLoading(false);
      return;
    }

    const ids = (data ?? []).map((c) => c.id as string);
    if (ids.length === 0) {
      const fallback = sampleContactPage({ search, source, book, sort, page, pageSize, tagId, liveTotal: count ?? 0 });
      setCache(key, fallback);
      setContacts(fallback.contacts);
      setTotal(fallback.total);
      setLoading(false);
      return;
    }

    const { data: linkRows, error: linkErr } = await supabase
      .from('contact_tags')
      .select('contact_id, tag:tag_id(id, name, color, created_at, updated_at)')
      .in('contact_id', ids);
    if (linkErr) {
      setError(linkErr.message);
      setLoading(false);
      return;
    }

    const byContact = new Map<string, Tag[]>();
    for (const row of linkRows ?? []) {
      const contactId = row.contact_id as string;
      const tag = row.tag as unknown as Tag | null;
      if (!tag) continue;
      const arr = byContact.get(contactId) ?? [];
      arr.push(tag);
      byContact.set(contactId, arr);
    }

    // Origem: traffic_type do deal mais recente de cada contato (coluna Origem).
    const { data: dealRows } = await supabase
      .from('deals')
      .select('contact_id, traffic_type, created_at')
      .in('contact_id', ids)
      .order('created_at', { ascending: false });
    const trafficByContact = new Map<string, string | null>();
    for (const d of (dealRows ?? []) as Array<{ contact_id: string; traffic_type: string | null }>) {
      if (!trafficByContact.has(d.contact_id)) trafficByContact.set(d.contact_id, d.traffic_type);
    }

    const merged: ContactWithTags[] = (data ?? []).map((c) => ({
      ...(c as Contact),
      tags: byContact.get(c.id as string) ?? [],
      traffic_type: trafficByContact.get(c.id as string) ?? null,
    }));
    const pageResult = sampleContactPage({
      search,
      source,
      book,
      sort,
      page,
      pageSize,
      tagId,
      live: merged,
      liveTotal: count ?? 0,
    });

    setCache(key, pageResult);
    setContacts(pageResult.contacts);
    setTotal(pageResult.total);
    setLoading(false);
  }, [userId, search, tagId, source, book, sort, page, pageSize]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create: UseContactsResult['create'] = async (input) => {
    if (!userId) return null;
    const { tag_ids = [], ...contactPayload } = input;
    const supabase = getSupabase();
    const { data, error: err } = await supabase
      .from('contacts')
      .insert({
        phone: contactPayload.phone,
        name: contactPayload.name ?? null,
        email: contactPayload.email ?? null,
        custom_fields: contactPayload.custom_fields ?? {},
      })
      .select()
      .single();
    if (err) {
      setError(err.message);
      throw new Error(translateContactError(err.message));
    }
    const created = data as Contact;
    if (tag_ids.length > 0) {
      await assignTagsTo([created.id], tag_ids);
    }
    invalidateCache('contacts:');
    await reload({ force: true });
    return created;
  };

  const update: UseContactsResult['update'] = async (id, patch) => {
    if (!userId) return;
    const { tag_ids, ...rest } = patch;
    const supabase = getSupabase();
    const { error: err } = await supabase.schema('whatsapp_hub').from('contacts').update(rest).eq('id', id);
    if (err) {
      setError(err.message);
      throw new Error(translateContactError(err.message));
    }
    if (tag_ids) {
      // Replace the tag set: delete old links, insert new ones.
      await supabase.schema('whatsapp_hub').from('contact_tags').delete().eq('contact_id', id);
      if (tag_ids.length > 0) {
        await supabase
          .from('contact_tags')
          .insert(tag_ids.map((tag_id) => ({ contact_id: id, tag_id })));
      }
    }
    invalidateCache('contacts:');
    await reload({ force: true });
  };

  const remove: UseContactsResult['remove'] = async (ids) => {
    if (ids.length === 0 || ids.every((id) => isStoryId(id))) return;
    const supabase = getSupabase();
    const { error: err } = await supabase.schema('whatsapp_hub').from('contacts').delete().in('id', ids);
    if (err) {
      setError(err.message);
      throw new Error(translateContactError(err.message));
    }
    invalidateCache('contacts:');
    await reload({ force: true });
  };

  const assignTags: UseContactsResult['assignTags'] = async (contactIds, tagIds) => {
    if (!userId || contactIds.length === 0 || tagIds.length === 0) return;
    await assignTagsTo(contactIds, tagIds);
    invalidateCache('contacts:');
    await reload({ force: true });
  };

  return { contacts, total, loading, error, reload, create, update, remove, assignTags };
}

export function useContactBook() {
  const { userId } = useAppUser();
  const cached = peekCache<AccountTally>('contacts:book');
  const [counts, setCounts] = useState<AccountTally>(
    () => cached ?? { active: 0, recent: 0, old: 0, prospect: 0, monthClients: 0 },
  );
  const [loading, setLoading] = useState(() => !cached);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    if (!peekCache('contacts:book')) setLoading(true);
    const supabase = getSupabase();
    const now = new Date();
    const views: AccountView[] = ['active', 'recent', 'old', 'prospect'];
    const counted = await Promise.all(
      views.map(async (view) => {
        let query = supabase.from('contacts').select('id', { count: 'exact', head: true });
        const range = viewRange(view, now);
        if (range.type === 'prospect') query = query.or('kind.is.null,kind.eq.lead');
        if (range.type === 'cliente') {
          query = query.eq('kind', 'cliente');
          if (range.from) query = query.gte('updated_at', range.from);
          if (range.to) query = query.lt('updated_at', range.to);
        }
        return query;
      }),
    );
    const failed = counted.find((result) => result.error);
    if (failed?.error) {
      setError(failed.error.message);
      setLoading(false);
      return;
    }
    const month = monthRange(now);
    const monthCount = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'cliente')
      .gte('updated_at', month.from)
      .lt('updated_at', month.to);
    if (monthCount.error) {
      setError(monthCount.error.message);
      setLoading(false);
      return;
    }
    const live: AccountTally = {
      active: counted[0].count ?? 0,
      recent: counted[1].count ?? 0,
      old: counted[2].count ?? 0,
      prospect: counted[3].count ?? 0,
      monthClients: monthCount.count ?? 0,
    };
    const sample = storyBook();
    const tally: AccountTally = {
      active: live.active + sample.active,
      recent: live.recent + sample.recent,
      old: live.old + sample.old,
      prospect: live.prospect + sample.prospect,
      monthClients: live.monthClients + sample.monthClients,
    };
    setCache('contacts:book', tally);
    setCounts(tally);
    setError(null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { counts, loading, error, reload };
}

async function assignTagsTo(contactIds: string[], tagIds: string[]) {
  const supabase = getSupabase();
  const rows = contactIds.flatMap((contact_id) =>
    tagIds.map((tag_id) => ({ contact_id, tag_id })),
  );
  // upsert handles duplicates — composite PK is (contact_id, tag_id).
  const { error } = await supabase
    .schema('whatsapp_hub')
    .from('contact_tags')
    .upsert(rows, { onConflict: 'contact_id,tag_id' });
  if (error) throw new Error(translateContactError(error.message));
}

// Maps the most common Postgres/PostgREST errors to actionable pt-BR messages
// so a non-technical operator sees "telefone já cadastrado" instead of a raw
// "duplicate key value violates unique constraint" string.
function translateContactError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('duplicate key') && lower.includes('phone')) {
    return 'Já existe um contato com este telefone.';
  }
  if (lower.includes('duplicate key')) {
    return 'Registro duplicado — verifique os dados informados.';
  }
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'Você não tem permissão para esta ação.';
  }
  if (lower.includes('violates check constraint') || lower.includes('invalid input')) {
    return 'Dados inválidos — revise os campos e tente novamente.';
  }
  return message || 'Não foi possível concluir a operação.';
}
