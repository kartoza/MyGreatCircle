-- MyGreatCircle project-specific Neovim configuration

-- Go settings
vim.api.nvim_create_autocmd("FileType", {
  pattern = "go",
  callback = function()
    vim.opt_local.tabstop = 4
    vim.opt_local.shiftwidth = 4
    vim.opt_local.expandtab = false
  end,
})

-- JavaScript/JSX settings
vim.api.nvim_create_autocmd("FileType", {
  pattern = { "javascript", "javascriptreact", "json" },
  callback = function()
    vim.opt_local.tabstop = 2
    vim.opt_local.shiftwidth = 2
    vim.opt_local.expandtab = true
  end,
})

-- Format on save for Go
vim.api.nvim_create_autocmd("BufWritePre", {
  pattern = "*.go",
  callback = function()
    vim.lsp.buf.format({ async = false })
  end,
})

-- Which-key mappings (if available)
local ok, wk = pcall(require, "which-key")
if ok then
  wk.register({
    p = {
      name = "Project",
      b = { "<cmd>!make build<CR>", "Build" },
      r = { "<cmd>!make run<CR>", "Run" },
      d = { "<cmd>!make dev<CR>", "Dev servers" },
      t = { "<cmd>!make test<CR>", "Test Go" },
      T = { "<cmd>!cd web && npm test<CR>", "Test Web" },
      l = { "<cmd>!make lint<CR>", "Lint Go" },
      L = { "<cmd>!cd web && npm run lint<CR>", "Lint Web" },
      w = {
        name = "Web",
        i = { "<cmd>!cd web && npm install<CR>", "Install" },
        d = { "<cmd>!cd web && npm run dev<CR>", "Dev" },
        b = { "<cmd>!cd web && npm run build<CR>", "Build" },
      },
    },
  }, { prefix = "<leader>" })
end
