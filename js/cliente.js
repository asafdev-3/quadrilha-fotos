const FOTOS_POR_PAGINA = 6
let todasFotos = []
let paginaAtual = 1

async function entrar() {
  const codigo = document.getElementById('input-codigo').value.trim()
  const senha = document.getElementById('input-senha').value.trim()
  const erro = document.getElementById('erro-login')
  erro.style.display = 'none'

  if (codigo.length !== 6 || !senha) {
    erro.textContent = 'Preencha todos os campos.'
    erro.style.display = 'block'
    return
  }

  const senhaHash = btoa(senha)

  const { data: cliente, error } = await db
    .from('clientes')
    .select('*')
    .eq('codigo', codigo)
    .eq('senha_hash', senhaHash)
    .single()

  if (error || !cliente) {
    erro.textContent = 'Código ou senha incorretos.'
    erro.style.display = 'block'
    return
  }

  const agora = new Date()
  const expira = new Date(cliente.expira_em)
  if (agora > expira) {
    erro.textContent = 'Seu acesso expirou.'
    erro.style.display = 'block'
    return
  }

  const { data: fotos } = await db
    .from('fotos')
    .select('*')
    .eq('cliente_id', cliente.id)
    .order('ordem')

  todasFotos = fotos || []
  paginaAtual = 1

  document.getElementById('tela-login').style.display = 'none'
  document.getElementById('tela-fotos').style.display = 'block'
  document.getElementById('nome-cliente').textContent = cliente.nome

  renderFotos()
}

function renderFotos() {
  const grid = document.getElementById('grid-fotos')
  const paginacao = document.getElementById('paginacao')
  grid.innerHTML = ''

  if (todasFotos.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);grid-column:span 2;font-size:0.875rem">Nenhuma foto ainda.</p>'
    paginacao.innerHTML = ''
    return
  }

  const totalPaginas = Math.ceil(todasFotos.length / FOTOS_POR_PAGINA)
  const inicio = (paginaAtual - 1) * FOTOS_POR_PAGINA
  const fim = inicio + FOTOS_POR_PAGINA
  const fotosPagina = todasFotos.slice(inicio, fim)

  fotosPagina.forEach(foto => {
    const div = document.createElement('div')
    div.className = 'foto-card'
    div.innerHTML = `
      <img src="${foto.url}" alt="Foto" onclick="verFoto('${foto.url}')">
      <a onclick="baixarFoto('${foto.url}')">↓ Baixar</a>
    `
    grid.appendChild(div)
  })

  // Paginação
  if (totalPaginas > 1) {
    paginacao.innerHTML = `
      <button onclick="mudarPagina(${paginaAtual - 1})" ${paginaAtual === 1 ? 'disabled' : ''}>← Anterior</button>
      <span class="pagina-info">${paginaAtual} / ${totalPaginas}</span>
      <button onclick="mudarPagina(${paginaAtual + 1})" ${paginaAtual === totalPaginas ? 'disabled' : ''}>Próxima →</button>
    `
  } else {
    paginacao.innerHTML = ''
  }
}

function mudarPagina(nova) {
  paginaAtual = nova
  renderFotos()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function verFoto(url) {
  window.open(url, '_blank')
}

async function baixarFoto(url) {
  const response = await fetch(url)
  const blob = await response.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'foto-quadrilha.jpg'
  a.click()
  URL.revokeObjectURL(a.href)
}

function sair() {
  todasFotos = []
  paginaAtual = 1
  document.getElementById('tela-fotos').style.display = 'none'
  document.getElementById('tela-login').style.display = 'block'
  document.getElementById('input-codigo').value = ''
  document.getElementById('input-senha').value = ''
}