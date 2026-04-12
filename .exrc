" MyGreatCircle project shortcuts
" All under <leader>p prefix

" Build & Run
nnoremap <leader>pb :!make build<CR>
nnoremap <leader>pr :!make run<CR>
nnoremap <leader>pd :!make dev<CR>

" Testing
nnoremap <leader>pt :!make test<CR>
nnoremap <leader>pT :!cd web && npm test<CR>

" Linting
nnoremap <leader>pl :!make lint<CR>
nnoremap <leader>pL :!cd web && npm run lint<CR>

" Web
nnoremap <leader>pwi :!cd web && npm install<CR>
nnoremap <leader>pwd :!cd web && npm run dev<CR>
nnoremap <leader>pwb :!cd web && npm run build<CR>

" Documentation
nnoremap <leader>pdd :!make docs-dev<CR>
nnoremap <leader>pdb :!make docs-build<CR>
