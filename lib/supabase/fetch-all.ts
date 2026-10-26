const PAGE_SIZE = 1000

// O Supabase devolve no máximo 1000 linhas por consulta e corta o resto em silêncio.
// Busca página por página (ordenando por id para a paginação ser estável) até trazer tudo.
// `buildQuery` precisa criar uma consulta nova a cada chamada.
export async function fetchAllRows<T = any>(
    buildQuery: () => any
): Promise<{ data: T[]; error: any }> {
    const rows: T[] = []
    for (let from = 0; ; from += PAGE_SIZE) {
        const { data, error } = await buildQuery()
            .order('id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1)
        if (error) return { data: rows, error }
        rows.push(...(data || []))
        if (!data || data.length < PAGE_SIZE) return { data: rows, error: null }
    }
}
