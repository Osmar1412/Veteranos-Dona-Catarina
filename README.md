# ⚽ Site Oficial - E.C. Veteranos do Dona Catarina

Este é o repositório do site oficial do **Esporte Clube Veteranos do Dona Catarina**, time amador de futebol fundado em **14/04/1996**, localizado no Bairro Dona Catarina, Mairinque - SP, com mando de jogo no **Campo da Cerim**.

O site foi construído com uma arquitetura estática moderna (Single Page Application via Abas) utilizando HTML5 semântico, CSS3 (Glassmorphism e Gradientes) e Javascript puro, ideal para ser hospedado gratuitamente no **GitHub Pages**.

---

## 🛠️ Funcionalidades do Site

1. **Início (Home):** Informações principais do time, campo (Campo da Cerim) e links rápidos.
2. **História:** Trajetória do clube desde a fundação em 1996 (com linha do tempo).
3. **Próximos Compromissos:** Calendário dinâmico de jogos e locais das partidas aos Domingos.
4. **Elenco:** Lista completa de jogadores ativos por posição com filtragem interativa.
5. **Agendamento:** Formulário integrado com a API do WhatsApp. O visitante preenche os dados do desafio e é redirecionado para enviar a mensagem formatada direto ao WhatsApp do clube.
6. **Painel do Administrador:**
   - Acessado clicando em **Admin** no menu (Senha padrão: `catarina`).
   - Permite cadastrar novos jogadores (Nome, Nº da camisa e Posição).
   - Permite excluir jogadores.
   - Possui função de **Exportar Elenco (JSON)** e **Importar Elenco (JSON)**.

> ℹ️ **Nota sobre o Painel Admin:** Como o site é estático (sem banco de dados servidor), as edições feitas no painel administrativo ficam salvas no navegador local (`localStorage`). Para tornar as alterações permanentes para todos os visitantes do site, você pode exportar o arquivo JSON do elenco no painel e substituir a lista inicial no topo do arquivo `app.js` (dentro de `defaultPlayers`).

---

## 🚀 Como Publicar no GitHub Pages (Passo a Passo)

Siga os comandos abaixo no terminal para enviar este código para a sua conta do GitHub e hospedá-lo:

### 1. Inicializar o Git localmente
Abra o terminal (PowerShell ou Git Bash) dentro da pasta `Veteranos Dona Catarina` e execute:
```bash
git init
git add .
git commit -m "feat: site oficial veteranos dona catarina inicial"
```

### 2. Criar o repositório no GitHub
1. Vá até o seu GitHub (https://github.com) e crie um repositório chamado `veteranos-dona-catarina` (pode ser público).
2. Não adicione README, .gitignore ou Licença (deixe o repositório vazio).

### 3. Vincular e enviar os arquivos
Copie o link do repositório criado e rode no seu terminal (substituindo pelo seu link do GitHub):
```bash
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/veteranos-dona-catarina.git
git push -u origin main
```

### 4. Ativar o GitHub Pages
1. No seu repositório no GitHub, clique na aba **Settings** (Configurações).
2. No menu lateral esquerdo, clique em **Pages**.
3. Na seção **Build and deployment**, sob **Source**, selecione **Deploy from a branch**.
4. Em **Branch**, selecione `main` e a pasta `/ (root)`. Clique em **Save**.
5. Em 2 a 5 minutos, o GitHub gerará um link público para o seu site (ex: `https://seu-usuario.github.io/veteranos-dona-catarina/`).

---

## 💻 Como Executar Localmente
Basta dar dois cliques no arquivo `index.html` ou usar extensões como o *Live Server* no VS Code para rodar o site diretamente em qualquer navegador.
