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

1. 在 `AutoMapperProfile` 中設定 `Author` 到 `AuthorDto` 的映射。
2. 使用 `.ForMember` 實作 `ShortBio` 的邏輯。

### 解答

#### 步驟 1：建立 AutoMapper Profile

在 `Application` 專案中建立或編輯 AutoMapper Profile：

```csharp
// Application/BookStoreApplicationAutoMapperProfile.cs
using AutoMapper;
using BookStore.Authors;

namespace BookStore
{
    public class BookStoreApplicationAutoMapperProfile : Profile
    {
        public BookStoreApplicationAutoMapperProfile()
        {
            // Entity -> DTO (包含 ShortBio 計算)
            CreateMap<Author, AuthorDto>()
                .ForMember(dest => dest.ShortBio, opt => opt.MapFrom(src => GetShortBio(src.Bio)));

            // CreateDTO -> Entity
            CreateMap<CreateUpdateAuthorDto, Author>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreationTime, opt => opt.Ignore())
                .ForMember(dest => dest.CreatorId, opt => opt.Ignore())
                .ForMember(dest => dest.LastModificationTime, opt => opt.Ignore())
                .ForMember(dest => dest.LastModifierId, opt => opt.Ignore())
                .ForMember(dest => dest.IsDeleted, opt => opt.Ignore())
                .ForMember(dest => dest.DeleterId, opt => opt.Ignore())
                .ForMember(dest => dest.DeletionTime, opt => opt.Ignore());
        }

        /// <summary>
        /// 取得簡短傳記（前 50 字元）
        /// </summary>
        private static string GetShortBio(string bio)
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

#### 步驟 2：進階映射技巧

**方法 1：使用 Lambda 表達式（內聯）**

```csharp
CreateMap<Author, AuthorDto>()
    .ForMember(dest => dest.ShortBio,
        opt => opt.MapFrom(src =>
            string.IsNullOrWhiteSpace(src.Bio)
                ? string.Empty
                : (src.Bio.Length <= 50 ? src.Bio : src.Bio.Substring(0, 50) + "...")));
```

**方法 2：使用擴展方法**

```csharp
// Application/Authors/AuthorExtensions.cs
public static class AuthorExtensions
{
    public static string ToShortBio(this string bio, int maxLength = 50)
    {
        if (string.IsNullOrWhiteSpace(bio))
        {
            return string.Empty;
        }

        return bio.Length <= maxLength
            ? bio
            : bio.Substring(0, maxLength) + "...";
    }
}

// 在 Profile 中使用
CreateMap<Author, AuthorDto>()
    .ForMember(dest => dest.ShortBio, opt => opt.MapFrom(src => src.Bio.ToShortBio()));
```

**方法 3：使用 Value Resolver（複雜邏輯）**

```csharp
// Application/Authors/ShortBioResolver.cs
using AutoMapper;

namespace BookStore.Authors
{
    public class ShortBioResolver : IValueResolver<Author, AuthorDto, string>
    {
        public string Resolve(Author source, AuthorDto destination, string destMember, ResolutionContext context)
        {
            if (string.IsNullOrWhiteSpace(source.Bio))
            {
                return string.Empty;
            }

            const int maxLength = 50;
            return source.Bio.Length <= maxLength
                ? source.Bio
                : source.Bio.Substring(0, maxLength) + "...";
        }
    }
}

// 在 Profile 中使用
CreateMap<Author, AuthorDto>()
    .ForMember(dest => dest.ShortBio, opt => opt.MapFrom<ShortBioResolver>());
```

**理論依據**：

- `.ForMember` 允許自訂特定屬性的映射邏輯
- `MapFrom` 指定來源屬性或計算邏輯
- Value Resolver 適合複雜的映射邏輯，可重用且易於測試

---

## 練習 3：實作 CRUD

### 題目

1. 使用 `CrudAppService` 快速實作 `AuthorAppService`。
2. 覆寫 `CreateAsync` 方法，在建立前檢查作者是否已存在 (呼叫 Repository)。

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
