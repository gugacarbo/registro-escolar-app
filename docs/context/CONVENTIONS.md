<!-- Capítulo de contexto RECONHECIDO pelo CASA (STANDARD §4/§8).
     Copie para docs/context/CONVENTIONS.md e aponte no Mapa de contexto do AGENTS.md:
       | `docs/context/CONVENTIONS.md` | ao alterar contratos de API, estado cliente, formulários, componentes UI ou persistência |
     Conteúdo IMPERATIVO e ATEMPORAL ("use X", "NUNCA Y", "o estado atual é Z").
     Quando este capítulo é DECLARADO no router, o docs-check exige ao menos UM comando
     canônico em bloco de código — liste o comando real do repo, não prosa. -->

# Convenções

## Comandos canônicos

```bash
npm run check            # exit 0
bun run check            # exit 0 (equivalente)
```

## Requisições assíncronas

- Use **sempre** o TanStack Query (`reactQuery`) para realizar requisições assíncronas.
- Aproveie dados **stale** para manter a interface responsiva e reduzir chamadas de rede.
- Configure `staleTime` e `gcTime` de forma explícita, de acordo com a volatilidade de cada recurso.
- Controle explicitamente quando fazer **refetch**; evite refetches automáticos indiscriminados.

## Invalidação de cache

- Sempre que um dado for alterado no servidor, **invalidate as query keys** afetadas.
- Após uma mutação bem-sucedida, chame `queryClient.invalidateQueries(...)` para as chaves que representam o recurso modificado.
- Quando a invalidação não for suficiente (por exemplo, o servidor não sinaliza mudanças de dependência), faça `refetch` manual das queries relevantes.
- Nunca confie apenas na atualização local de estado: mantenha o servidor como fonte da verdade.

## Componentes compartilhados

### Sempre reutilize antes de criar

- Antes de criar qualquer novo componente visual, **procure por componentes existentes** no projeto.
- A fonte primária de componentes reutilizáveis é `src/components/ui/`, que contém os componentes do shadcn/ui customizados para este projeto.
- A lista de componentes disponíveis inclui (sem ser limitada a): `Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`, `Dialog`, `Sheet`, `Card`, `Tabs`, `Table`, `Form`, `Label`, `Badge`, `Avatar`, `Toast/Sonner`, `Skeleton`, `Spinner`, `Popover`, `Command`, `Combobox`, `Calendar`, entre outros.

### Onde procurar

1. `src/components/ui/` — componentes base do shadcn/ui.
2. `src/components/` — componentes compartilhados entre rotas ou domínios.
3. `src/integrations/` — wrappers de integrações (ex.: TanStack Query, better-auth).
4. `src/hooks/` — hooks reutilizáveis.

### Regras

- **NUNCA** duplique um componente que já existe em `src/components/ui/` ou `src/components/`.
- Se um componente do shadcn/ui atender a 80% da necessidade, **use-o** e customize via props, `className` ou `cn()` — não recrie a partir do zero.
- Se a customização for repetida em mais de um lugar, crie uma **variação local** dentro de `src/components/ui/` ou um componente composto em `src/components/`, nunca uma duplicata.
- Sempre prefira composição (`asChild`, `children`, slots) a copiar markup interno de um componente.
- Antes de adicionar uma nova dependência de componente externo, verifique se já há equivalente em `src/components/ui/`.

### O que fazer quando não encontrar

- Verifique se o nome do componente está próximo do shadcn/ui (por exemplo, `Toggle`, `ToggleGroup`, `Slider`).
- Consulte o `components.json` e o `src/components/ui/` com `ls` ou busca.
- Se realmente for necessário um novo componente:
  - siga o padrão de API do shadcn/ui (slots `data-slot`, composição com `Slot.Root`, variantes via `cva`);
  - coloque-o em `src/components/ui/` se for genérico;
  - coloque-o em `src/components/` se for específico de domínio e compartilhado;
  - documente o uso em `docs/context/CONVENTIONS.md` se introduzir um padrão novo.

## Formulários

### React Hook Form é obrigatório

- Todo formulário React do projeto **DEVE** ser construído com **react-hook-form**.
- NUNCA use estado local (`useState`) para controlar campos de formulário diretamente.
- NUNCA use refs manuais (`useRef`) como estratégia principal de leitura/validação de valores.
- Use `useForm` para instanciar o formulário e `FormProvider` (alias `Form`) para distribuir o contexto.

### Componentes de formulário do shadcn/ui

- Use **sempre** os componentes de formulário customizados do projeto, localizados em `src/components/ui/form.tsx`.
- A API esperada é:

  | Componente              | Finalidade                                                  |
  | ----------------------- | ----------------------------------------------------------- |
  | `Form` / `FormProvider` | Provedor de contexto do react-hook-form.                    |
  | `FormNative`            | Renderiza `<form>` conectado a `handleSubmit` e `reset`.    |
  | `FormField`             | Declara um campo do formulário usando `Controller`.         |
  | `FormItem`              | Wrapper de cada campo (label + input + mensagem).           |
  | `FormLabel`             | Label acessível vinculado ao input pelo `htmlFor`.          |
  | `FormControl`           | Slot que repassa `id`, `aria-invalid` e `aria-describedby`. |
  | `FormDescription`       | Texto auxiliar do campo.                                    |
  | `FormMessage`           | Mensagem de erro vinda do react-hook-form.                  |
  | `FormSubmit`            | Botão de submit que respeita `isSubmitting`.                |
  | `FormReset`             | Botão que reseta o formulário para `defaultValues`.         |

### Estrutura padrão de um formulário

```tsx
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormNative,
  FormSubmit,
  useForm,
} from '#/components/ui/form.tsx'
import { Input } from '#/components/ui/input.tsx'

function ExampleForm() {
  const form = useForm({
    defaultValues: { email: '' },
  })

  return (
    <Form {...form}>
      <FormNative onSubmit={(values) => console.log(values)}>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormSubmit>Salvar</FormSubmit>
      </FormNative>
    </Form>
  )
}
```

### Regras de implementação

- Sempre forneça `defaultValues` em `useForm`; evite valores `undefined` para inputs controlados.
- Sempre use `FormNative` para o elemento `<form>`; ele já conecta `handleSubmit` e `reset`.
- Use `FormControl` como wrapper direto do input/checkbox/select; ele repassa acessibilidade e estados de erro.
- Exiba mensagens de erro com `FormMessage`; não renderize erros manualmente fora do padrão.
- Para actions assíncronas, use `form.handleSubmit` ou `FormNative` + TanStack Query para executar a mutação.
- Em formulários de edição, preencha `defaultValues` com os dados carregados via TanStack Query.

### O que não fazer

- Não use `<input value={state} onChange={...} />` controlado por `useState`.
- Não use componentes de formulário de outras bibliotecas ou cópias manuais dos wrappers.
- Não acesse `form.control` fora de `FormField` sem necessidade; prefira `useWatch` ou `useFormContext`.
