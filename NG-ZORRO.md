# FRONTEND-NG-ZORRO.md - Guidelines NG-ZORRO

Este projeto usa NG-ZORRO como biblioteca principal de componentes Angular.

---

## Principios Gerais

- Priorizar componentes NG-ZORRO antes de criar componentes customizados.
- Seguir o Design System do NG-ZORRO.
- Manter consistencia visual entre telas.
- Garantir responsividade em desktop, tablet e mobile.
- Reduzir CSS customizado quando o NG-ZORRO ja resolver o caso.
- Evitar `alert`, `confirm` e `prompt` nativos do navegador.

---

## Layout

Estrutura recomendada para area autenticada:

```html
<nz-layout>
  <nz-sider></nz-sider>
  <nz-layout>
    <nz-header></nz-header>
    <nz-content></nz-content>
  </nz-layout>
</nz-layout>
```

Usar:

- `nz-layout`
- `nz-sider`
- `nz-header`
- `nz-content`
- `nz-menu`
- `nz-breadcrumb`

Evitar excesso de `div` sem funcao semantica ou visual.

---

## Containers

Usar quando fizer sentido:

- `nz-card`
- `nz-space`
- `nz-divider`
- `nz-flex`
- `nz-row`
- `nz-col`

Cards devem representar itens, formularios ou blocos reais de conteudo. Nao
use cards dentro de cards.

---

## Formularios

Padrao:

```html
<form nz-form [formGroup]="form" (ngSubmit)="submit()">
  <nz-form-item>
    <nz-form-label nzRequired>E-mail</nz-form-label>
    <nz-form-control nzErrorTip="Informe um e-mail valido">
      <input nz-input formControlName="email" />
    </nz-form-control>
  </nz-form-item>
</form>
```

Componentes preferenciais:

- `nz-input`
- `nz-input-number`
- `nz-select`
- `nz-date-picker`
- `nz-time-picker`
- `nz-checkbox`
- `nz-radio-group`
- `nz-switch`
- `nz-upload`

Regras:

- Usar Reactive Forms.
- Exibir mensagens de erro abaixo dos campos.
- Usar validators do Angular.
- Usar loading no submit.
- Desabilitar botao quando necessario para evitar duplo envio.

---

## Tabelas

Usar `nz-table` para listagens.

```html
<nz-table
  [nzData]="dados()"
  [nzLoading]="loading()"
  [nzFrontPagination]="false"
  [nzTotal]="total()"
  [nzPageIndex]="pageIndex()"
  [nzPageSize]="pageSize()">
</nz-table>
```

Regras:

- Usar paginacao em listas que podem crescer.
- Usar ordenacao quando necessario.
- Usar filtros quando aplicavel.
- Exibir loading durante carregamento.
- Exibir estado vazio quando nao houver dados.
- Validar nomes de campos de sort antes de enviar para API quando rota for publica.

---

## Modais

Usar `NzModalService` ou `nz-modal`.

```typescript
this.modal.confirm({
  nzTitle: 'Confirmar exclusao',
  nzContent: 'Deseja remover este registro?',
  nzOkDanger: true,
  nzOnOk: () => this.excluir()
});
```

Regras:

- Confirmacoes destrutivas devem usar modal.
- Erros devem usar notification/message, nao alert nativo.
- Modal deve ter titulo claro e acao principal objetiva.

---

## Drawer

Usar `nz-drawer` para:

- Detalhes de registros.
- Formularios rapidos.
- Visualizacao lateral sem troca de pagina.

```html
<nz-drawer
  [nzVisible]="drawerAberto()"
  nzTitle="Detalhes"
  (nzOnClose)="fecharDrawer()">
</nz-drawer>
```

---

## Mensagens e Notificacoes

Usar `NzNotificationService` para:

- Sucesso persistente o suficiente para leitura.
- Erros de operacao.
- Avisos importantes.

```typescript
this.notification.success('Sucesso', 'Registro salvo com sucesso');
```

Usar `NzMessageService` para feedback temporario e simples.

---

## Loading

Usar:

- `nz-spin`
- `nz-skeleton`
- `nzLoading` em botoes e tabelas

Nunca deixar uma requisicao sem feedback visual quando ela impacta a tela.

---

## Botoes

Primario:

```html
<button nz-button nzType="primary">Salvar</button>
```

Secundario:

```html
<button nz-button>Cancelar</button>
```

Perigo:

```html
<button nz-button nzDanger>Excluir</button>
```

Icones:

```html
<span nz-icon nzType="save"></span>
```

Regras:

- Usar icones do NG-ZORRO quando disponiveis.
- Botoes iconicos precisam de `aria-label`.
- Acoes destrutivas usam `nzDanger`.

---

## Responsividade

Usar grid do NG-ZORRO:

```html
<nz-row [nzGutter]="16">
  <nz-col nzXs="24" nzSm="12" nzMd="8" nzLg="6">
  </nz-col>
</nz-row>
```

Regras:

- Mobile first.
- Evitar larguras fixas.
- Usar breakpoints do NG-ZORRO.
- Garantir que textos nao estourem botoes, cards ou tabelas.

---

## Evitar

- Manipulacao direta do DOM.
- `any` sem justificativa.
- Logica complexa no template.
- CSS customizado excessivo.
- Componentes customizados quando houver equivalente NG-ZORRO.
- Alerts nativos.
- Layouts que dependem de largura fixa.
