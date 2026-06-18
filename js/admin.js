// Proteção de rota
if (!sessionStorage.getItem('admin')) {
  window.location.href = 'index.html'
}

// Tab switching
function trocarTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('ativo'))
  document.querySelectorAll('.tab-btns button').forEach(b => {
    b.classList.remove('ativo')
    b.classList.add('inativo')
  })
  document.getElementById('tab-' + tab).classList.add('ativo')
  event.target.classList.add('ativo')
  event.target.classList.remove('inativo')

  if (tab === 'upload') carregarClientesSelect()
  if (tab === 'clientes') carregarListaClientes()
}

// Gerar código único de 6 dígitos
function gerarCodigo() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

// Cadastrar cliente
async function cadastrarCliente() {
  const nome = document.getElementById('nome-cliente').value.trim()
  const senha = document.getElementById('senha-cliente').value.trim()
  const erro = document.getElementById('erro-cadastro')
  erro.style.display = 'none'

  if (!nome || !senha) {
    erro.textContent = 'Preencha nome e senha.'
    erro.style.display = 'block'
    return
  }

  if (senha.length < 4) {
    erro.textContent = 'Senha deve ter ao menos 4 caracteres.'
    erro.style.display = 'block'
    return
  }

  const senhaHash = btoa(senha)
  let codigo = gerarCodigo()

  // Garante código único
  let tentativas = 0
  while (tentativas < 10) {
    const { data } = await db
      .from('clientes')
      .select('id')
      .eq('codigo', codigo)
      .single()

    if (!data) break
    codigo = gerarCodigo()
    tentativas++
  }

  const { error } = await db
    .from('clientes')
    .insert({ nome, codigo, senha_hash: senhaHash })

  if (error) {
    erro.textContent = 'Erro ao cadastrar. Tente novamente.'
    erro.style.display = 'block'
    console.error(error)
    return
  }

  // Mostra o código gerado
  document.getElementById('numero-gerado').textContent = codigo
  document.getElementById('form-cadastro').style.display = 'none'
  document.getElementById('codigo-gerado').style.display = 'block'
}

function novoCliente() {
  document.getElementById('nome-cliente').value = ''
  document.getElementById('senha-cliente').value = ''
  document.getElementById('erro-cadastro').style.display = 'none'
  document.getElementById('codigo-gerado').style.display = 'none'
  document.getElementById('form-cadastro').style.display = 'block'
}

// Carregar clientes no select
async function carregarClientesSelect() {
  const select = document.getElementById('select-cliente')
  select.innerHTML = '<option value="">Selecione...</option>'

  const { data: clientes } = await db
    .from('clientes')
    .select('id, nome, codigo')
    .order('criado_em', { ascending: false })

  if (!clientes || clientes.length === 0) {
    select.innerHTML = '<option value="">Nenhum cliente cadastrado</option>'
    return
  }

  clientes.forEach(c => {
    const opt = document.createElement('option')
    opt.value = c.id
    opt.textContent = `${c.nome} — ${c.codigo}`
    select.appendChild(opt)
  })
}

// Preview de fotos
document.addEventListener('DOMContentLoaded', () => {
  const inputFotos = document.getElementById('input-fotos')
  if (inputFotos) {
    inputFotos.addEventListener('change', () => {
      const preview = document.getElementById('preview-fotos')
      const contador = document.getElementById('contador-fotos')
      preview.innerHTML = ''

      const arquivos = Array.from(inputFotos.files).slice(0, 15)
      contador.textContent = `${arquivos.length} foto(s) selecionada(s)`

      arquivos.forEach(arquivo => {
        const img = document.createElement('img')
        img.src = URL.createObjectURL(arquivo)
        preview.appendChild(img)
      })
    })
  }
})

// Upload de fotos
async function fazerUpload() {
  const clienteId = document.getElementById('select-cliente').value
  const inputFotos = document.getElementById('input-fotos')
  const erro = document.getElementById('erro-upload')
  erro.style.display = 'none'

  if (!clienteId) {
    erro.textContent = 'Selecione um cliente.'
    erro.style.display = 'block'
    return
  }

  const arquivos = Array.from(inputFotos.files).slice(0, 15)

  if (arquivos.length === 0) {
    erro.textContent = 'Selecione ao menos uma foto.'
    erro.style.display = 'block'
    return
  }

  const { data: fotosExistentes } = await db
    .from('fotos')
    .select('id')
    .eq('cliente_id', clienteId)

  const total = (fotosExistentes?.length || 0) + arquivos.length
  if (total > 15) {
    erro.textContent = `Limite de 15 fotos. Cliente já tem ${fotosExistentes.length}.`
    erro.style.display = 'block'
    return
  }

  const btn = document.querySelector('#tab-upload button')
  btn.textContent = 'Enviando...'
  btn.disabled = true

  let ordem = fotosExistentes?.length || 0

  for (const arquivo of arquivos) {
    const ext = arquivo.name.split('.').pop()
    const path = `${clienteId}/${Date.now()}.${ext}`

    const { error: uploadError } = await db.storage
      .from('fotos')
      .upload(path, arquivo)

    if (uploadError) continue

    const { data: urlData } = db.storage
      .from('fotos')
      .getPublicUrl(path)

    await db.from('fotos').insert({
      cliente_id: clienteId,
      url: urlData.publicUrl,
      ordem: ordem++
    })
  }

  btn.textContent = 'Enviar fotos'
  btn.disabled = false
  erro.textContent = '✅ Fotos enviadas com sucesso!'
  erro.style.color = '#4caf50'
  erro.style.display = 'block'

  inputFotos.value = ''
  document.getElementById('preview-fotos').innerHTML = ''
  document.getElementById('contador-fotos').textContent = ''

  setTimeout(() => {
    erro.style.display = 'none'
    erro.style.color = '#ff4444'
  }, 3000)
}

// Lista de clientes
async function carregarListaClientes() {
  const lista = document.getElementById('lista-clientes')
  lista.innerHTML = '<p style="color:#666">Carregando...</p>'

  const { data: clientes } = await db
    .from('clientes')
    .select('id, nome, codigo, criado_em')
    .order('criado_em', { ascending: false })

  if (!clientes || clientes.length === 0) {
    lista.innerHTML = '<p style="color:#666">Nenhum cliente cadastrado.</p>'
    return
  }

  lista.innerHTML = ''
  clientes.forEach(c => {
    const div = document.createElement('div')
    div.className = 'cliente-item'
    div.innerHTML = `
      <div class="nome">${c.nome}</div>
      <div class="codigo">Código: ${c.codigo}</div>
    `
    lista.appendChild(div)
  })
}