# 第十一章：應用層設計 (DTOs & Object Mapping) - 習題解答

本文件提供第十一章實戰練習的完整解答，包含詳細的步驟說明、程式碼範例和理論依據。

---

## 練習 1：設計 DTO

### 題目

1. 為 `Author` 實體設計 DTOs：`AuthorDto`, `CreateAuthorDto`, `UpdateAuthorDto`。
2. `AuthorDto` 應包含 `ShortBio` 屬性，這是一個計算屬性 (取 Bio 的前 50 字元)。

### 解答

#### 步驟 1：定義 Author 實體（參考）

首先，我們假設 `Author` 實體的結構如下：

```csharp
// Domain/Authors/Author.cs
using System;
using Volo.Abp.Domain.Entities.Auditing;

namespace BookStore.Authors
{
    public class Author : FullAuditedAggregateRoot<Guid>
    {
        public string Name { get; set; }
        public DateTime BirthDate { get; set; }
        public string Bio { get; set; }

        private Author()
        {
            // 用於 ORM
        }

        public Author(Guid id, string name, DateTime birthDate, string bio = null)
            : base(id)
        {
            Name = name;
            BirthDate = birthDate;
            Bio = bio;
        }
    }
}
```

#### 步驟 2：定義 AuthorDto（輸出 DTO）

`AuthorDto` 用於將作者資訊傳遞給客戶端，包含計算屬性 `ShortBio`。

```csharp
// Application.Contracts/Authors/AuthorDto.cs
using System;
using Volo.Abp.Application.Dtos;

namespace BookStore.Authors
{
    public class AuthorDto : AuditedEntityDto<Guid>
    {
        public string Name { get; set; }
        public DateTime BirthDate { get; set; }
        public string Bio { get; set; }

        /// <summary>
        /// 計算屬性：取 Bio 的前 50 字元
        /// </summary>
        public string ShortBio { get; set; }
    }
}
```

**設計說明**：

- 繼承 `AuditedEntityDto<Guid>`：自動包含 `Id`、`CreationTime`、`CreatorId` 等審計屬性
- `ShortBio` 屬性將在 AutoMapper 映射時計算

#### 步驟 3：定義 CreateAuthorDto（建立輸入 DTO）

```csharp
// Application.Contracts/Authors/CreateAuthorDto.cs
using System;
using System.ComponentModel.DataAnnotations;

namespace BookStore.Authors
{
    public class CreateAuthorDto
    {
        [Required]
        [StringLength(128)]
        public string Name { get; set; }

        [Required]
        public DateTime BirthDate { get; set; }

        [StringLength(2000)]
        public string Bio { get; set; }
    }
}
```

**設計說明**：

- 使用 Data Annotations 進行驗證
- 不包含 `Id`（由系統自動生成）
- 不包含審計屬性（由 ABP 自動填充）

#### 步驟 4：定義 UpdateAuthorDto（更新輸入 DTO）

```csharp
// Application.Contracts/Authors/UpdateAuthorDto.cs
using System;
using System.ComponentModel.DataAnnotations;

namespace BookStore.Authors
{
    public class UpdateAuthorDto
    {
        [Required]
        [StringLength(128)]
        public string Name { get; set; }

        [Required]
        public DateTime BirthDate { get; set; }

        [StringLength(2000)]
        public string Bio { get; set; }
    }
}
```

**設計說明**：

- 與 `CreateAuthorDto` 結構相似
- 可以考慮讓 `UpdateAuthorDto` 繼承 `CreateAuthorDto`，或使用共同基類 `CreateUpdateAuthorDto`

#### 步驟 5：使用共同基類（最佳實踐）

為了避免重複，可以定義一個共同的基類：

```csharp
// Application.Contracts/Authors/CreateUpdateAuthorDto.cs
using System;
using System.ComponentModel.DataAnnotations;

namespace BookStore.Authors
{
    public class CreateUpdateAuthorDto
    {
        [Required]
        [StringLength(128)]
        public string Name { get; set; }

        [Required]
        public DateTime BirthDate { get; set; }

        [StringLength(2000)]
        public string Bio { get; set; }
    }
}
```

然後 `CreateAuthorDto` 和 `UpdateAuthorDto` 可以繼承或直接使用此類。

---

## 練習 2：自訂映射

### 題目

1. 使用 **Mapperly** 實作 `Author` 到 `AuthorDto` 的映射。
2. 實作 `ShortBio` 的自訂映射邏輯（取 Bio 的前 50 字元）。

### 解答

#### 步驟 1：建立 Mapper 類別

在 `Application` 專案中建立 `BookStoreMapper` 類別。請注意，Mapperly 使用 **Source Generators**，因此類別必須是 `partial`。

```csharp
// Application/BookStoreMapper.cs
using Riok.Mapperly.Abstractions;
using BookStore.Authors;

namespace BookStore
{
    [Mapper]
    public partial class BookStoreMapper
    {
        // Entity -> DTO
        [MapProperty(nameof(Author.Bio), nameof(AuthorDto.ShortBio), Use = nameof(MapShortBio))]
        public partial AuthorDto AuthorToAuthorDto(Author author);

        // CreateDTO -> Entity
        // 忽略由 ABP 自動管理的屬性
        [MapperIgnoreTarget(nameof(Author.Id))]
        [MapperIgnoreTarget(nameof(Author.CreationTime))]
        [MapperIgnoreTarget(nameof(Author.CreatorId))]
        [MapperIgnoreTarget(nameof(Author.LastModificationTime))]
        [MapperIgnoreTarget(nameof(Author.LastModifierId))]
        [MapperIgnoreTarget(nameof(Author.IsDeleted))]
        [MapperIgnoreTarget(nameof(Author.DeleterId))]
        [MapperIgnoreTarget(nameof(Author.DeletionTime))]
        public partial Author CreateDtoToAuthor(CreateUpdateAuthorDto dto);

        // 自訂映射邏輯
        private string MapShortBio(string bio)
        {
            if (string.IsNullOrWhiteSpace(bio))
            {
                return string.Empty;
            }

            return bio.Length <= 50
                ? bio
                : bio.Substring(0, 50) + "...";
        }
    }
}
```

#### 步驟 2：註冊 Mapper（可選）

如果您希望像 AutoMapper 一樣透過 `IObjectMapper` 介面使用，可以實作 `IObjectMapper<TSource, TDestination>`，但在 ABP V10 中，直接注入 `BookStoreMapper` 或使用擴充方法是更高效的做法。

若要維持與 ABP `IObjectMapper` 的相容性，通常會保留 AutoMapper 作為預設，或使用 Mapperly 的 ABP 整合套件（若有）。但在高效能場景下，建議直接使用 Mapperly 生成的方法。

**理論依據**：

- **Mapperly** 是基於 Source Generator 的編譯時映射工具。
- **效能**：比 AutoMapper 快得多，因為沒有執行時期的 Reflection 開銷。
- **除錯**：生成的程式碼可讀且可除錯。
- **[MapProperty]**：用於指定屬性對映與自訂轉換邏輯。

---

---

## 練習 3：實作 CRUD

### 題目

1. 使用 `CrudAppService` 快速實作 `AuthorAppService`。
2. 覆寫 `CreateAsync` 方法，在建立前檢查作者是否已存在 (呼叫 Repository)。
3. **(V10 更新)** 覆寫映射方法以使用 Mapperly 提升效能。

### 解答

#### 步驟 1：定義 Application Service 介面

```csharp
// Application.Contracts/Authors/IAuthorAppService.cs
using System;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace BookStore.Authors
{
    public interface IAuthorAppService :
        ICrudAppService<
            AuthorDto,
            Guid,
            PagedAndSortedResultRequestDto,
            CreateUpdateAuthorDto>
    {
    }
}
```

#### 步驟 2：實作 Application Service（整合 Mapperly）

為了獲得最佳效能，我們注入 `BookStoreMapper` 並覆寫 `CrudAppService` 的映射方法。

```csharp
// Application/Authors/AuthorAppService.cs
using System;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace BookStore.Authors
{
    public class AuthorAppService :
        CrudAppService<
            Author,
            AuthorDto,
            Guid,
            PagedAndSortedResultRequestDto,
            CreateUpdateAuthorDto>,
        IAuthorAppService
    {
        private readonly BookStoreMapper _mapper;

        public AuthorAppService(
            IRepository<Author, Guid> repository,
            BookStoreMapper mapper)
            : base(repository)
        {
            _mapper = mapper;
        }

        // 覆寫：Entity -> DTO
        protected override AuthorDto MapToGetOutputDto(Author entity)
        {
            return _mapper.AuthorToAuthorDto(entity);
        }

        // 覆寫：Entity List -> DTO List
        // 注意：CrudAppService 預設會迴圈呼叫 MapToGetOutputDto，
        // 若 Mapperly 有提供 List 映射方法也可在此優化。

        // 覆寫：CreateDto -> Entity
        protected override Author MapToEntity(CreateUpdateAuthorDto createInput)
        {
            return _mapper.CreateDtoToAuthor(createInput);
        }

        // 覆寫：UpdateDto -> Entity
        protected override void MapToEntity(CreateUpdateAuthorDto updateInput, Author entity)
        {
            // Mapperly 支援 Update 方法：
            // _mapper.Update(updateInput, entity);
            // 這裡假設我們在 Mapper 中定義了 UpdateAuthorFromDto
            // _mapper.UpdateAuthorFromDto(updateInput, entity);

            // 若未定義 Update 方法，可暫時手動映射或使用 ObjectMapper (若仍有設定)
            base.MapToEntity(updateInput, entity);
        }

        public override async Task<AuthorDto> CreateAsync(CreateUpdateAuthorDto input)
        {
            // 檢查作者是否已存在（根據姓名）
            var existingAuthor = await Repository.FirstOrDefaultAsync(
                a => a.Name == input.Name);

            if (existingAuthor != null)
            {
                throw new UserFriendlyException(
                    $"作者 '{input.Name}' 已經存在！",
                    "AUTHOR_ALREADY_EXISTS");
            }

            return await base.CreateAsync(input);
        }
    }
}
```

#### 步驟 3：進階實作（使用領域服務）

更好的做法是將業務邏輯移到領域層（同原解答，此處省略重複代碼，僅強調 Application Service 的變化）。

```csharp
// Application/Authors/AuthorAppService.cs（使用領域服務 + Mapperly）
public class AuthorAppService : ...
{
    private readonly AuthorManager _authorManager;
    private readonly BookStoreMapper _mapper;

    public AuthorAppService(
        IRepository<Author, Guid> repository,
        AuthorManager authorManager,
        BookStoreMapper mapper)
        : base(repository)
    {
        _authorManager = authorManager;
        _mapper = mapper;
    }

    public override async Task<AuthorDto> CreateAsync(CreateUpdateAuthorDto input)
    {
        // 使用領域服務建立作者
        var author = await _authorManager.CreateAsync(
            input.Name,
            input.BirthDate,
            input.Bio
        );

        // 使用 Mapperly 映射為 DTO
        return _mapper.AuthorToAuthorDto(author);
    }
}
```

**理論依據**：

- **CrudAppService**：提供了快速開發 CRUD 的基底類別。
- **覆寫映射方法**：這是將 Mapperly 整合進 `CrudAppService` 的關鍵，透過覆寫 `MapToGetOutputDto` 和 `MapToEntity`，我們可以繞過預設的 `ObjectMapper` (AutoMapper)，改用高效的編譯時映射。
- **依賴注入**：直接注入 Mapper 類別是使用 Mapperly 的標準方式。

---

## 總結

本章練習涵蓋了 ABP Framework 應用層設計的核心概念：

1. **DTO 設計**：

   - 使用 ABP 提供的基類（`AuditedEntityDto`）
   - 遵循命名慣例（`CreateDto`、`UpdateDto`）

2. **物件映射 (V10)**：

   - 使用 **Mapperly** 取代 AutoMapper
   - 定義 `partial` Mapper 類別與 `[Mapper]` 屬性
   - 在 Service 中直接注入並使用 Mapper

3. **CRUD 實作**：
   - 使用 `CrudAppService` 快速開發
   - 覆寫映射方法以整合 Mapperly
   - 使用領域服務封裝業務規則

**最佳實踐**：

- DTO 應該是「啞」物件，不包含業務邏輯
- 複雜的業務規則應放在領域層
- 使用 ABP 的異常類型提供友善的錯誤訊息
- **優先使用 Mapperly** 以獲得最佳效能與型別安全

---

## 參考資源

- **效能**：比 AutoMapper 快得多，因為沒有執行時期的 Reflection 開銷。
- **除錯**：生成的程式碼可讀且可除錯。
- **[MapProperty]**：用於指定屬性對映與自訂轉換邏輯。

---

---

## 練習 3：實作 CRUD

### 題目

1. 使用 `CrudAppService` 快速實作 `AuthorAppService`。
2. 覆寫 `CreateAsync` 方法，在建立前檢查作者是否已存在 (呼叫 Repository)。
3. **(V10 更新)** 覆寫映射方法以使用 Mapperly 提升效能。

### 解答

#### 步驟 1：定義 Application Service 介面

```csharp
// Application.Contracts/Authors/IAuthorAppService.cs
using System;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace BookStore.Authors
{
    public interface IAuthorAppService :
        ICrudAppService<
            AuthorDto,
            Guid,
            PagedAndSortedResultRequestDto,
            CreateUpdateAuthorDto>
    {
    }
}
```

#### 步驟 2：實作 Application Service（整合 Mapperly）

為了獲得最佳效能，我們注入 `BookStoreMapper` 並覆寫 `CrudAppService` 的映射方法。

```csharp
// Application/Authors/AuthorAppService.cs
using System;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace BookStore.Authors
{
    public class AuthorAppService :
        CrudAppService<
            Author,
            AuthorDto,
            Guid,
            PagedAndSortedResultRequestDto,
            CreateUpdateAuthorDto>,
        IAuthorAppService
    {
        private readonly BookStoreMapper _mapper;

        public AuthorAppService(
            IRepository<Author, Guid> repository,
            BookStoreMapper mapper)
            : base(repository)
        {
            _mapper = mapper;
        }

        // 覆寫：Entity -> DTO
        protected override AuthorDto MapToGetOutputDto(Author entity)
        {
            return _mapper.AuthorToAuthorDto(entity);
        }

        // 覆寫：Entity List -> DTO List
        // 注意：CrudAppService 預設會迴圈呼叫 MapToGetOutputDto，
        // 若 Mapperly 有提供 List 映射方法也可在此優化。

        // 覆寫：CreateDto -> Entity
        protected override Author MapToEntity(CreateUpdateAuthorDto createInput)
        {
            return _mapper.CreateDtoToAuthor(createInput);
        }

        // 覆寫：UpdateDto -> Entity
        protected override void MapToEntity(CreateUpdateAuthorDto updateInput, Author entity)
        {
            // Mapperly 支援 Update 方法：
            // _mapper.Update(updateInput, entity);
            // 這裡假設我們在 Mapper 中定義了 UpdateAuthorFromDto
            // _mapper.UpdateAuthorFromDto(updateInput, entity);

            // 若未定義 Update 方法，可暫時手動映射或使用 ObjectMapper (若仍有設定)
            base.MapToEntity(updateInput, entity);
        }

        public override async Task<AuthorDto> CreateAsync(CreateUpdateAuthorDto input)
        {
            // 檢查作者是否已存在（根據姓名）
            var existingAuthor = await Repository.FirstOrDefaultAsync(
                a => a.Name == input.Name);

            if (existingAuthor != null)
            {
                throw new UserFriendlyException(
                    $"作者 '{input.Name}' 已經存在！",
                    "AUTHOR_ALREADY_EXISTS");
            }

            return await base.CreateAsync(input);
        }
    }
}
```

#### 步驟 3：進階實作（使用領域服務）

更好的做法是將業務邏輯移到領域層（同原解答，此處省略重複代碼，僅強調 Application Service 的變化）。

```csharp
// Application/Authors/AuthorAppService.cs（使用領域服務 + Mapperly）
public class AuthorAppService : ...
{
    private readonly AuthorManager _authorManager;
    private readonly BookStoreMapper _mapper;

    public AuthorAppService(
        IRepository<Author, Guid> repository,
        AuthorManager authorManager,
        BookStoreMapper mapper)
        : base(repository)
    {
        _authorManager = authorManager;
        _mapper = mapper;
    }

    public override async Task<AuthorDto> CreateAsync(CreateUpdateAuthorDto input)
    {
        // 使用領域服務建立作者
        var author = await _authorManager.CreateAsync(
            input.Name,
            input.BirthDate,
            input.Bio
        );

        // 使用 Mapperly 映射為 DTO
        return _mapper.AuthorToAuthorDto(author);
    }
}
```

**理論依據**：

- **CrudAppService**：提供了快速開發 CRUD 的基底類別。
- **覆寫映射方法**：這是將 Mapperly 整合進 `CrudAppService` 的關鍵，透過覆寫 `MapToGetOutputDto` 和 `MapToEntity`，我們可以繞過預設的 `ObjectMapper` (AutoMapper)，改用高效的編譯時映射。
- **依賴注入**：直接注入 Mapper 類別是使用 Mapperly 的標準方式。

---

## 總結

本章練習涵蓋了 ABP Framework 應用層設計的核心概念：

1. **DTO 設計**：

   - 使用 ABP 提供的基類（`AuditedEntityDto`）
   - 遵循命名慣例（`CreateDto`、`UpdateDto`）

2. **物件映射 (V10)**：

   - 使用 **Mapperly** 取代 AutoMapper
   - 定義 `partial` Mapper 類別與 `[Mapper]` 屬性
   - 在 Service 中直接注入並使用 Mapper

3. **CRUD 實作**：
   - 使用 `CrudAppService` 快速開發
   - 覆寫方法加入自訂邏輯
   - 使用領域服務封裝業務規則

**最佳實踐**：

- DTO 應該是「啞」物件，不包含業務邏輯
- 複雜的業務規則應放在領域層
- 使用 ABP 的異常類型提供友善的錯誤訊息
- **優先使用 Mapperly** 以獲得最佳效能與型別安全

---

## 參考資源

### 解答

#### 步驟 1：定義 Application Service 介面

```csharp
// Application.Contracts/Authors/IAuthorAppService.cs
using System;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;

namespace BookStore.Authors
{
    public interface IAuthorAppService :
        ICrudAppService<
            AuthorDto,
            Guid,
            PagedAndSortedResultRequestDto,
            CreateUpdateAuthorDto>
    {
    }
}
```

**說明**：

- 繼承 `ICrudAppService` 自動定義標準 CRUD 方法
- 泛型參數：`AuthorDto`（輸出）、`Guid`（主鍵）、`PagedAndSortedResultRequestDto`（查詢輸入）、`CreateUpdateAuthorDto`（建立/更新輸入）

#### 步驟 2：實作 Application Service（基本版）

```csharp
// Application/Authors/AuthorAppService.cs
using System;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace BookStore.Authors
{
    public class AuthorAppService :
        CrudAppService<
            Author,
            AuthorDto,
            Guid,
            PagedAndSortedResultRequestDto,
            CreateUpdateAuthorDto>,
        IAuthorAppService
    {
        public AuthorAppService(IRepository<Author, Guid> repository)
            : base(repository)
        {
        }
    }
}
```

**說明**：

- 繼承 `CrudAppService` 自動實作所有 CRUD 方法
- 不需要手動編寫 `GetAsync`、`GetListAsync`、`CreateAsync`、`UpdateAsync`、`DeleteAsync`

#### 步驟 3：覆寫 CreateAsync 方法（加入重複檢查）

```csharp
// Application/Authors/AuthorAppService.cs
using System;
using System.Linq;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace BookStore.Authors
{
    public class AuthorAppService :
        CrudAppService<
            Author,
            AuthorDto,
            Guid,
            PagedAndSortedResultRequestDto,
            CreateUpdateAuthorDto>,
        IAuthorAppService
    {
        public AuthorAppService(IRepository<Author, Guid> repository)
            : base(repository)
        {
        }

        public override async Task<AuthorDto> CreateAsync(CreateUpdateAuthorDto input)
        {
            // 檢查作者是否已存在（根據姓名）
            var existingAuthor = await Repository.FirstOrDefaultAsync(
                a => a.Name == input.Name);

            if (existingAuthor != null)
            {
                throw new UserFriendlyException(
                    $"作者 '{input.Name}' 已經存在！",
                    "AUTHOR_ALREADY_EXISTS");
            }

            // 呼叫基類的 CreateAsync 方法
            return await base.CreateAsync(input);
        }
    }
}
```

#### 步驟 4：進階實作（使用領域服務）

更好的做法是將業務邏輯移到領域層：

```csharp
// Domain/Authors/AuthorManager.cs
using System;
using System.Threading.Tasks;
using Volo.Abp;
using Volo.Abp.Domain.Repositories;
using Volo.Abp.Domain.Services;

namespace BookStore.Authors
{
    public class AuthorManager : DomainService
    {
        private readonly IRepository<Author, Guid> _authorRepository;

        public AuthorManager(IRepository<Author, Guid> authorRepository)
        {
            _authorRepository = authorRepository;
        }

        public async Task<Author> CreateAsync(string name, DateTime birthDate, string bio = null)
        {
            // 檢查作者是否已存在
            var existingAuthor = await _authorRepository.FirstOrDefaultAsync(
                a => a.Name == name);

            if (existingAuthor != null)
            {
                throw new BusinessException("BookStore:AuthorAlreadyExists")
                    .WithData("Name", name);
            }

            // 建立新作者
            var author = new Author(
                GuidGenerator.Create(),
                name,
                birthDate,
                bio
            );

            return await _authorRepository.InsertAsync(author);
        }
    }
}
```

```csharp
// Application/Authors/AuthorAppService.cs（使用領域服務）
using System;
using System.Threading.Tasks;
using Volo.Abp.Application.Dtos;
using Volo.Abp.Application.Services;
using Volo.Abp.Domain.Repositories;

namespace BookStore.Authors
{
    public class AuthorAppService :
        CrudAppService<
            Author,
            AuthorDto,
            Guid,
            PagedAndSortedResultRequestDto,
            CreateUpdateAuthorDto>,
        IAuthorAppService
    {
        private readonly AuthorManager _authorManager;

        public AuthorAppService(
            IRepository<Author, Guid> repository,
            AuthorManager authorManager)
            : base(repository)
        {
            _authorManager = authorManager;
        }

        public override async Task<AuthorDto> CreateAsync(CreateUpdateAuthorDto input)
        {
            // 使用領域服務建立作者
            var author = await _authorManager.CreateAsync(
                input.Name,
                input.BirthDate,
                input.Bio
            );

            // 映射為 DTO
            return ObjectMapper.Map<Author, AuthorDto>(author);
        }
    }
}
```

**理論依據**：

- **應用層**：協調工作流程，不包含業務邏輯
- **領域層**：包含核心業務規則（如重複檢查）
- **分離關注點**：讓每一層專注於自己的職責

#### 步驟 5：本地化錯誤訊息

在 `Domain.Shared/Localization/BookStore/zh-Hant.json` 中新增：

```json
{
  "culture": "zh-Hant",
  "texts": {
    "BookStore:AuthorAlreadyExists": "作者 '{Name}' 已經存在！"
  }
}
```

---

## 總結

本章練習涵蓋了 ABP Framework 應用層設計的核心概念：

1. **DTO 設計**：

   - 使用 ABP 提供的基類（`AuditedEntityDto`）
   - 遵循命名慣例（`CreateDto`、`UpdateDto`）
   - 使用 Data Annotations 進行驗證

2. **物件映射**：

   - 使用 AutoMapper Profile 定義映射規則
   - `.ForMember` 實作自訂映射邏輯
   - 計算屬性的映射技巧

3. **CRUD 實作**：
   - 使用 `CrudAppService` 快速開發
   - 覆寫方法加入自訂邏輯
   - 使用領域服務封裝業務規則

**最佳實踐**：

- DTO 應該是「啞」物件，不包含業務邏輯
- 複雜的業務規則應放在領域層
- 使用 ABP 的異常類型（`UserFriendlyException`、`BusinessException`）提供友善的錯誤訊息
- 善用 AutoMapper 的進階功能（Value Resolver、Custom Converter）

---

## 參考資源

- [ABP DTO 文件](https://docs.abp.io/en/abp/latest/Data-Transfer-Objects)
- [ABP Object Mapping 文件](https://docs.abp.io/en/abp/latest/Object-To-Object-Mapping)
- [ABP Application Services 文件](https://docs.abp.io/en/abp/latest/Application-Services)
- [AutoMapper 官方文件](https://docs.automapper.org/)
