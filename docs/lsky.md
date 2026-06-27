# 批量修改图片信息

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/photos/update:
    put:
      summary: 批量修改图片信息
      deprecated: false
      description: ''
      tags:
        - 用户/图库
      parameters:
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: 名称
                  x-apifox-mock: '{{$lorem.sentence(locale=''zh_CN'')}}'
                intro:
                  type: string
                  description: 简介
                  x-apifox-mock: '{{$lorem.sentence(locale=''zh_CN'')}}'
                is_public:
                  type: boolean
                  description: 是否公开
                  x-apifox-mock: '{{$datatype.boolean}}'
                tags:
                  type: array
                  items:
                    type: string
                  description: 标签
                ids:
                  type: array
                  items:
                    type: integer
                  description: 图片id
              x-apifox-orders:
                - name
                - intro
                - is_public
                - tags
                - ids
              required:
                - name
                - is_public
                - tags
                - ids
            example:
              ids: []
              name: 果程究热
              intro: 转周收或车构亲九真省千动记界一。
              is_public: true
      responses:
        '204':
          description: ''
          content:
            '*/*':
              schema:
                type: object
                properties: {}
          headers: {}
          x-apifox-name: 修改成功
      security: []
      x-apifox-folder: 用户/图库
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-291491222-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```

# 相册详情

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/albums/{id}:
    get:
      summary: 相册详情
      deprecated: false
      description: ''
      tags:
        - 用户/相册
      parameters:
        - name: id
          in: path
          description: 相册ID
          required: true
          example: 3
          schema:
            type: integer
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  message:
                    type: string
                  data:
                    type: object
                    properties:
                      id:
                        type: integer
                        description: 相册ID
                      name:
                        type: string
                        description: 名称
                      intro:
                        type: string
                        description: 简介
                      is_public:
                        type: boolean
                        description: 是否公开
                      created_at:
                        type: string
                        description: 创建时间
                      photo_count:
                        type: integer
                        description: 图片数量
                      covers:
                        type: array
                        items:
                          type: string
                        description: 封面图，最多三张，可能为空
                      tags:
                        type: array
                        items:
                          type: string
                        description: 标签
                    required:
                      - id
                      - name
                      - intro
                      - is_public
                      - created_at
                      - photo_count
                      - covers
                      - tags
                    x-apifox-orders:
                      - id
                      - name
                      - intro
                      - is_public
                      - created_at
                      - photo_count
                      - covers
                      - tags
                  time:
                    type: integer
                required:
                  - status
                  - message
                  - data
                  - time
                x-apifox-orders:
                  - status
                  - message
                  - data
                  - time
              example:
                status: success
                message: successful
                data:
                  id: 1
                  name: test2
                  intro: |-
                    11112
                    314
                  is_public: false
                  created_at: '2024-09-20T07:57:01.000000Z'
                  photo_count: 1
                  covers:
                    - >-
                      http://127.0.0.1:8000/uploads/20240905/2afba671098674026525895187e29c16.png
                  tags: []
                time: 1727143278
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: 用户/相册
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-188728515-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```# 添加相册

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/albums:
    post:
      summary: 添加相册
      deprecated: false
      description: ''
      tags:
        - 用户/相册
      parameters:
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: 相册名称
                  x-apifox-mock: '@ctitle'
                intro:
                  type: string
                  description: 简介
                  x-apifox-mock: '@csentence'
                is_public:
                  type: string
                  x-apifox-mock: '{{$datatype.boolean}}'
                  description: 是否公开
              x-apifox-orders:
                - name
                - intro
                - is_public
            example:
              name: 具义情族合
              intro: 手思水装建事先工院下具同。
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  message:
                    type: string
                  data:
                    type: object
                    properties:
                      id:
                        type: integer
                        description: 相册ID
                    required:
                      - id
                    x-apifox-orders:
                      - id
                  time:
                    type: integer
                required:
                  - status
                  - message
                  - data
                  - time
                x-apifox-orders:
                  - status
                  - message
                  - data
                  - time
              example:
                status: success
                message: successful
                data:
                  id: 3
                time: 1727141883
          headers: {}
          x-apifox-name: 成功
        '422':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  message:
                    type: string
                  data:
                    type: object
                    properties:
                      errors:
                        type: object
                        properties:
                          name:
                            type: array
                            items:
                              type: string
                        required:
                          - name
                    required:
                      - errors
                  time:
                    type: integer
                required:
                  - status
                  - message
                  - data
                  - time
          headers: {}
          x-apifox-name: 参数错误
      security: []
      x-apifox-folder: 用户/相册
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-188638302-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```# 修改相册

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/albums/{id}:
    put:
      summary: 修改相册
      deprecated: false
      description: ''
      tags:
        - 用户/相册
      parameters:
        - name: id
          in: path
          description: 相册ID
          required: true
          example: 2
          schema:
            type: integer
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: 相册名称
                  x-apifox-mock: '@ctitle'
                intro:
                  type: string
                  description: 简介
                  x-apifox-mock: '@csentence'
                is_public:
                  type: string
                  x-apifox-mock: '{{$datatype.boolean}}'
                  description: 是否公开
              x-apifox-orders:
                - name
                - intro
                - is_public
            example:
              name: 热八响
              intro: 作所活照织强构南技务石长眼片很。
      responses:
        '204':
          description: ''
          content:
            '*/*':
              schema:
                type: object
                properties: {}
          headers: {}
          x-apifox-name: 修改成功
      security: []
      x-apifox-folder: 用户/相册
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-188731769-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```# 删除相册

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/albums/{id}:
    delete:
      summary: 删除相册
      deprecated: false
      description: ''
      tags:
        - 用户/相册
      parameters:
        - name: id
          in: path
          description: 相册ID
          required: true
          example: 1
          schema:
            type: integer
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      responses:
        '204':
          description: ''
          content:
            '*/*':
              schema:
                type: object
                properties: {}
          headers: {}
          x-apifox-name: 删除成功
      security: []
      x-apifox-folder: 用户/相册
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-188753717-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```# 添加图片到相册

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/albums/{id}/photos:
    post:
      summary: 添加图片到相册
      deprecated: false
      description: ''
      tags:
        - 用户/相册
      parameters:
        - name: id
          in: path
          description: 相册ID
          required: true
          example: 1
          schema:
            type: integer
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      requestBody:
        content:
          application/json:
            schema:
              type: array
              items:
                type: integer
                description: 图片ID
                x-apifox-mock: '{{$number.int(min=1,max=999)}}'
            example:
              - 889
              - 166
      responses:
        '201':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  message:
                    type: string
                  time:
                    type: integer
                required:
                  - status
                  - message
                  - time
              example:
                status: success
                message: successful
                time: 1727230262
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: 用户/相册
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-190248395-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```# 从相册中移除图片

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/albums/{id}/photos:
    delete:
      summary: 从相册中移除图片
      deprecated: false
      description: ''
      tags:
        - 用户/相册
      parameters:
        - name: id
          in: path
          description: 相册ID
          required: true
          example: 1
          schema:
            type: integer
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      requestBody:
        content:
          application/json:
            schema:
              type: array
              items:
                type: integer
                description: 图片ID
            example: []
      responses:
        '204':
          description: ''
          content:
            '*/*':
              schema:
                type: object
                properties: {}
          headers: {}
          x-apifox-name: 删除成功
      security: []
      x-apifox-folder: 用户/相册
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-190448775-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```# 附加标签

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/albums/{id}/tags:
    post:
      summary: 附加标签
      deprecated: false
      description: ''
      tags:
        - 用户/相册
      parameters:
        - name: id
          in: path
          description: 相册ID
          required: true
          example: 1
          schema:
            type: integer
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      requestBody:
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties: {}
                x-apifox-orders: []
            example:
              - 测试1
              - 测试2
      responses:
        '201':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties: {}
              example:
                status: success
                message: successful
                time: 1720070662
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: 用户/相册
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-190590406-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```# 移除标签

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/albums/{id}/tags:
    delete:
      summary: 移除标签
      deprecated: false
      description: ''
      tags:
        - 用户/相册
      parameters:
        - name: id
          in: path
          description: 相册ID
          required: true
          example: 1
          schema:
            type: integer
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      requestBody:
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties: {}
                x-apifox-orders: []
            example:
              - 测试1
              - 测试2
      responses:
        '204':
          description: ''
          content:
            '*/*':
              schema:
                type: object
                properties: {}
          headers: {}
          x-apifox-name: 移除成功
      security: []
      x-apifox-folder: 用户/相册
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-190614254-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```# 图片列表

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/photos:
    get:
      summary: 图片列表
      deprecated: false
      description: ''
      tags:
        - 用户/图库
      parameters:
        - name: page
          in: query
          description: 页码
          required: false
          example: 1
          schema:
            type: integer
        - name: per_page
          in: query
          description: 每页展示数量
          required: false
          example: 20
          schema:
            type: integer
        - name: q
          in: query
          description: 筛选关键字
          required: false
          example: ''
          schema:
            type: string
        - name: album_id
          in: query
          description: 相册ID
          required: false
          example: 0
          schema:
            type: integer
        - name: storage_id
          in: query
          description: 储存ID
          required: false
          schema:
            type: integer
        - name: order_by
          in: query
          description: 排序方式
          required: false
          schema:
            type: string
            enum:
              - latest
              - oldest
            x-apifox-enum:
              - value: latest
                name: 最新
                description: ''
              - value: oldest
                name: 最早
                description: ''
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  message:
                    type: string
                  data:
                    type: object
                    properties:
                      data:
                        type: array
                        items:
                          type: object
                          properties:
                            id:
                              type: integer
                              description: 图片ID
                            name:
                              type: string
                              description: 自定义名称
                            intro:
                              type: string
                              description: 简介
                            filename:
                              type: string
                              description: 文件名
                            pathname:
                              type: string
                              description: 文件路径名
                            mimetype:
                              type: string
                              description: 文件类型
                            extension:
                              type: string
                              description: 拓展名
                            md5:
                              type: string
                              description: md5值
                            sha1:
                              type: string
                              description: sha1值
                            width:
                              type: integer
                              description: 宽度
                            height:
                              type: integer
                              description: 高度
                            is_public:
                              type: boolean
                              description: 是否公开
                            ip_address:
                              type: string
                              description: 上传ip地址
                            expired_at:
                              type: 'null'
                              description: 到期时间
                            created_at:
                              type: string
                              description: 创建时间
                            thumbnail_url:
                              type: string
                              description: 缩略图地址
                            public_url:
                              type: string
                              description: 原图地址
                            group:
                              type: object
                              properties:
                                id:
                                  type: integer
                                  description: 角色组ID
                                name:
                                  type: string
                                  description: 角色组名称
                                intro:
                                  type: string
                                  description: 角色组简介
                              required:
                                - id
                                - name
                                - intro
                              description: 所在角色组信息
                            storage:
                              type: object
                              properties:
                                id:
                                  type: integer
                                  description: 储存ID
                                name:
                                  type: string
                                  description: 储存名称
                                intro:
                                  type: string
                                  description: 储存简介
                                provider:
                                  type: string
                                  description: 储存提供者
                              required:
                                - id
                                - name
                                - intro
                                - provider
                              description: 所在储存信息
                            albums:
                              type: array
                              items:
                                type: object
                                properties:
                                  id:
                                    type: integer
                                  name:
                                    type: string
                                  intro:
                                    type: string
                                required:
                                  - id
                                  - name
                                  - intro
                              description: 所在相册列表
                            tags:
                              type: array
                              items:
                                type: object
                                properties:
                                  id:
                                    type: integer
                                  name:
                                    type: string
                                required:
                                  - id
                                  - name
                              description: 标签信息
                          required:
                            - id
                            - name
                            - intro
                            - filename
                            - pathname
                            - mimetype
                            - extension
                            - md5
                            - sha1
                            - width
                            - height
                            - is_public
                            - ip_address
                            - expired_at
                            - created_at
                            - thumbnail_url
                            - public_url
                            - group
                            - storage
                            - albums
                            - tags
                      links:
                        type: object
                        properties:
                          first:
                            type: string
                          last:
                            type: string
                          prev:
                            type: 'null'
                          next:
                            type: 'null'
                        required:
                          - first
                          - last
                          - prev
                          - next
                      meta:
                        type: object
                        properties:
                          current_page:
                            type: integer
                          from:
                            type: integer
                          last_page:
                            type: integer
                          links:
                            type: array
                            items:
                              type: object
                              properties:
                                url:
                                  type: string
                                  nullable: true
                                label:
                                  type: string
                                active:
                                  type: boolean
                              required:
                                - url
                                - label
                                - active
                          path:
                            type: string
                          per_page:
                            type: integer
                          to:
                            type: integer
                          total:
                            type: integer
                        required:
                          - current_page
                          - from
                          - last_page
                          - links
                          - path
                          - per_page
                          - to
                          - total
                    required:
                      - data
                      - links
                      - meta
                  time:
                    type: integer
                required:
                  - status
                  - message
                  - data
                  - time
              example:
                status: success
                message: successful
                data:
                  data:
                    - id: 1
                      name: 真正的程序员
                      intro: ''
                      filename: 真正的程序员.png
                      pathname: 20240905/2afba671098674026525895187e29c16.png
                      mimetype: image/png
                      extension: png
                      md5: 2afba671098674026525895187e29c16
                      sha1: 48bbab6ce0e559ceac4a7578a0bc70c7a81eab0e
                      width: 571
                      height: 512
                      is_public: true
                      ip_address: 127.0.0.1
                      expired_at: null
                      created_at: '2024-09-05T01:59:26.000000Z'
                      thumbnail_url: >-
                        http://127.0.0.1:8000/uploads/20240905/2afba671098674026525895187e29c16.png
                      public_url: >-
                        http://127.0.0.1:8000/uploads/20240905/2afba671098674026525895187e29c16.png
                      group:
                        id: 1
                        name: 系统默认组
                        intro: 这是系统默认角色组
                      storage:
                        id: 1
                        name: 本地储存
                        intro: 这是本地储存驱动
                        provider: local
                      albums: []
                      tags:
                        - id: 1
                          name: 街头摄影
                        - id: 2
                          name: 城市建筑
                        - id: 1
                          name: 街头摄影
                        - id: 2
                          name: 城市建筑
                        - id: 1
                          name: 街头摄影
                        - id: 2
                          name: 城市建筑
                    - id: 2
                      name: 7a585313ed855e8d652cbb3154a6056e
                      intro: ''
                      filename: 7a585313ed855e8d652cbb3154a6056e.jpeg
                      pathname: 20240918/399fa7ca41917e534c31950ce412b51b.jpeg
                      mimetype: image/jpeg
                      extension: jpg
                      md5: 399fa7ca41917e534c31950ce412b51b
                      sha1: 455a2c8e8324924b7d1e56328e8e9d874d875db2
                      width: 1000
                      height: 1000
                      is_public: true
                      ip_address: 127.0.0.1
                      expired_at: null
                      created_at: '2024-09-18T09:27:51.000000Z'
                      thumbnail_url: >-
                        http://127.0.0.1:8000/uploads/20240918/399fa7ca41917e534c31950ce412b51b.jpeg
                      public_url: >-
                        http://127.0.0.1:8000/uploads/20240918/399fa7ca41917e534c31950ce412b51b.jpeg
                      group:
                        id: 1
                        name: 系统默认组
                        intro: 这是系统默认角色组
                      storage:
                        id: 1
                        name: 本地储存
                        intro: 这是本地储存驱动
                        provider: local
                      albums:
                        - id: 3
                          name: >-
                            具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合
                          intro: 手思水装建事先工院下具同。
                      tags: []
                    - id: 6
                      name: a157829fe078dad9bbfd268ff1ec3b01
                      intro: ''
                      filename: a157829fe078dad9bbfd268ff1ec3b01.jpeg
                      pathname: 20240919/f60751b682c4cdf0106d63aaf97ef9ba.jpeg
                      mimetype: image/jpeg
                      extension: jpg
                      md5: f60751b682c4cdf0106d63aaf97ef9ba
                      sha1: ace9dfef4a7ee1026cc1e0db6907a68dbb428ba8
                      width: 1080
                      height: 1080
                      is_public: true
                      ip_address: 127.0.0.1
                      expired_at: null
                      created_at: '2024-09-19T06:44:24.000000Z'
                      thumbnail_url: >-
                        http://127.0.0.1:8000/uploads/20240919/f60751b682c4cdf0106d63aaf97ef9ba.jpeg
                      public_url: >-
                        http://127.0.0.1:8000/uploads/20240919/f60751b682c4cdf0106d63aaf97ef9ba.jpeg
                      group:
                        id: 1
                        name: 系统默认组
                        intro: 这是系统默认角色组
                      storage:
                        id: 1
                        name: 本地储存
                        intro: 这是本地储存驱动
                        provider: local
                      albums:
                        - id: 3
                          name: >-
                            具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合
                          intro: 手思水装建事先工院下具同。
                        - id: 5
                          name: '2222'
                          intro: |-
                            123123232232
                            31231233312332
                      tags: []
                    - id: 9
                      name: 真正的程序员
                      intro: ''
                      filename: 真正的程序员.png
                      pathname: 20240919/2afba671098674026525895187e29c16.png
                      mimetype: image/png
                      extension: png
                      md5: 2afba671098674026525895187e29c16
                      sha1: 48bbab6ce0e559ceac4a7578a0bc70c7a81eab0e
                      width: 571
                      height: 512
                      is_public: true
                      ip_address: 127.0.0.1
                      expired_at: null
                      created_at: '2024-09-19T06:44:25.000000Z'
                      thumbnail_url: >-
                        http://127.0.0.1:8000/uploads/20240919/2afba671098674026525895187e29c16.png
                      public_url: >-
                        http://127.0.0.1:8000/uploads/20240919/2afba671098674026525895187e29c16.png
                      group:
                        id: 1
                        name: 系统默认组
                        intro: 这是系统默认角色组
                      storage:
                        id: 1
                        name: 本地储存
                        intro: 这是本地储存驱动
                        provider: local
                      albums:
                        - id: 3
                          name: >-
                            具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合
                          intro: 手思水装建事先工院下具同。
                        - id: 5
                          name: '2222'
                          intro: |-
                            123123232232
                            31231233312332
                      tags: []
                    - id: 10
                      name: IMG_0439111
                      intro: '223331111'
                      filename: IMG_0439.PNG
                      pathname: 20240919/e6bbc1777d6b2458ddeacf76d557b604.PNG
                      mimetype: image/png
                      extension: png
                      md5: e6bbc1777d6b2458ddeacf76d557b604
                      sha1: 7da845a312de07e332d0f5d84273e3a93f5ad263
                      width: 1170
                      height: 2532
                      is_public: true
                      ip_address: 127.0.0.1
                      expired_at: null
                      created_at: '2024-09-19T06:44:25.000000Z'
                      thumbnail_url: >-
                        http://127.0.0.1:8000/uploads/20240919/e6bbc1777d6b2458ddeacf76d557b604.PNG
                      public_url: >-
                        http://127.0.0.1:8000/uploads/20240919/e6bbc1777d6b2458ddeacf76d557b604.PNG
                      group:
                        id: 1
                        name: 系统默认组
                        intro: 这是系统默认角色组
                      storage:
                        id: 1
                        name: 本地储存
                        intro: 这是本地储存驱动
                        provider: local
                      albums:
                        - id: 3
                          name: >-
                            具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合
                          intro: 手思水装建事先工院下具同。
                        - id: 4
                          name: 新建相册
                          intro: 这是一个新建相册
                        - id: 5
                          name: '2222'
                          intro: |-
                            123123232232
                            31231233312332
                      tags:
                        - id: 3
                          name: '123'
                        - id: 4
                          name: '213'
                        - id: 5
                          name: '4123'
                        - id: 6
                          name: '222'
                        - id: 7
                          name: '2222'
                        - id: 8
                          name: '423'
                        - id: 9
                          name: '412'
                        - id: 10
                          name: '4324'
                        - id: 11
                          name: '111111'
                    - id: 12
                      name: ChMkJlbKwdSIBXyaABDQ5_X5vbEAALGegFJFcIAEND_912
                      intro: ''
                      filename: ChMkJlbKwdSIBXyaABDQ5_X5vbEAALGegFJFcIAEND_912.jpg
                      pathname: 20240919/5c6ad49c962c3731412fd6d72765e6d5.jpg
                      mimetype: image/jpeg
                      extension: jpg
                      md5: 5c6ad49c962c3731412fd6d72765e6d5
                      sha1: edb99390c4205d87e9c53a0994065bd62f17a253
                      width: 1920
                      height: 1200
                      is_public: true
                      ip_address: 127.0.0.1
                      expired_at: null
                      created_at: '2024-09-19T06:44:25.000000Z'
                      thumbnail_url: >-
                        http://127.0.0.1:8000/uploads/20240919/5c6ad49c962c3731412fd6d72765e6d5.jpg
                      public_url: >-
                        http://127.0.0.1:8000/uploads/20240919/5c6ad49c962c3731412fd6d72765e6d5.jpg
                      group:
                        id: 1
                        name: 系统默认组
                        intro: 这是系统默认角色组
                      storage:
                        id: 1
                        name: 本地储存
                        intro: 这是本地储存驱动
                        provider: local
                      albums:
                        - id: 3
                          name: >-
                            具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合
                          intro: 手思水装建事先工院下具同。
                        - id: 5
                          name: '2222'
                          intro: |-
                            123123232232
                            31231233312332
                      tags: []
                    - id: 13
                      name: IMG_1499
                      intro: ''
                      filename: IMG_1499.PNG
                      pathname: 20240919/6fc44935eb88b1434a73b0e1ed05bde0.PNG
                      mimetype: image/png
                      extension: png
                      md5: 6fc44935eb88b1434a73b0e1ed05bde0
                      sha1: 829f7b91cd70aab664b8b6f80bcc065894348a7e
                      width: 1170
                      height: 2532
                      is_public: true
                      ip_address: 127.0.0.1
                      expired_at: null
                      created_at: '2024-09-19T06:44:25.000000Z'
                      thumbnail_url: >-
                        http://127.0.0.1:8000/uploads/20240919/6fc44935eb88b1434a73b0e1ed05bde0.PNG
                      public_url: >-
                        http://127.0.0.1:8000/uploads/20240919/6fc44935eb88b1434a73b0e1ed05bde0.PNG
                      group:
                        id: 1
                        name: 系统默认组
                        intro: 这是系统默认角色组
                      storage:
                        id: 1
                        name: 本地储存
                        intro: 这是本地储存驱动
                        provider: local
                      albums:
                        - id: 3
                          name: >-
                            具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合具义情族合
                          intro: 手思水装建事先工院下具同。
                        - id: 5
                          name: '2222'
                          intro: |-
                            123123232232
                            31231233312332
                      tags: []
                    - id: 14
                      name: 7a585313ed855e8d652cbb3154a6056e
                      intro: ''
                      filename: 7a585313ed855e8d652cbb3154a6056e.jpeg
                      pathname: 20241016/399fa7ca41917e534c31950ce412b51b.jpeg
                      mimetype: image/jpeg
                      extension: jpg
                      md5: 399fa7ca41917e534c31950ce412b51b
                      sha1: 455a2c8e8324924b7d1e56328e8e9d874d875db2
                      width: 1000
                      height: 1000
                      is_public: true
                      ip_address: 127.0.0.1
                      expired_at: null
                      created_at: '2024-10-16T09:36:18.000000Z'
                      thumbnail_url: >-
                        http://127.0.0.1:8000/uploads/20241016/399fa7ca41917e534c31950ce412b51b.jpeg
                      public_url: >-
                        http://127.0.0.1:8000/uploads/20241016/399fa7ca41917e534c31950ce412b51b.jpeg
                      group:
                        id: 1
                        name: 系统默认组
                        intro: 这是系统默认角色组
                      storage:
                        id: 1
                        name: 本地储存
                        intro: 这是本地储存驱动
                        provider: local
                      albums: []
                      tags: []
                    - id: 15
                      name: 5de83214350f1daa2806a1df507d6546
                      intro: ''
                      filename: 5de83214350f1daa2806a1df507d6546.png
                      pathname: 20241016/5de83214350f1daa2806a1df507d6546.png
                      mimetype: image/png
                      extension: png
                      md5: 5de83214350f1daa2806a1df507d6546
                      sha1: fba51de2b3f00d06ea76c0bd3e6fae611c9ac460
                      width: 351
                      height: 656
                      is_public: true
                      ip_address: 127.0.0.1
                      expired_at: null
                      created_at: '2024-10-16T09:36:31.000000Z'
                      thumbnail_url: >-
                        http://127.0.0.1:8000/uploads/20241016/5de83214350f1daa2806a1df507d6546.png
                      public_url: >-
                        http://127.0.0.1:8000/uploads/20241016/5de83214350f1daa2806a1df507d6546.png
                      group:
                        id: 1
                        name: 系统默认组
                        intro: 这是系统默认角色组
                      storage:
                        id: 1
                        name: 本地储存
                        intro: 这是本地储存驱动
                        provider: local
                      albums: []
                      tags: []
                    - id: 16
                      name: 7a585313ed855e8d652cbb3154a6056e
                      intro: ''
                      filename: 7a585313ed855e8d652cbb3154a6056e.jpeg
                      pathname: 20241017/399fa7ca41917e534c31950ce412b51b.jpeg
                      mimetype: image/jpeg
                      extension: jpg
                      md5: 399fa7ca41917e534c31950ce412b51b
                      sha1: 455a2c8e8324924b7d1e56328e8e9d874d875db2
                      width: 1000
                      height: 1000
                      is_public: true
                      ip_address: 127.0.0.1
                      expired_at: null
                      created_at: '2024-10-17T06:21:51.000000Z'
                      thumbnail_url: >-
                        http://127.0.0.1:8000/uploads/20241017/399fa7ca41917e534c31950ce412b51b.jpeg
                      public_url: >-
                        http://127.0.0.1:8000/uploads/20241017/399fa7ca41917e534c31950ce412b51b.jpeg
                      group:
                        id: 1
                        name: 系统默认组
                        intro: 这是系统默认角色组
                      storage:
                        id: 1
                        name: 本地储存
                        intro: 这是本地储存驱动
                        provider: local
                      albums: []
                      tags: []
                    - id: 17
                      name: 5de83214350f1daa2806a1df507d6546
                      intro: ''
                      filename: 5de83214350f1daa2806a1df507d6546.png
                      pathname: 20241017/5de83214350f1daa2806a1df507d6546.png
                      mimetype: image/png
                      extension: png
                      md5: 5de83214350f1daa2806a1df507d6546
                      sha1: fba51de2b3f00d06ea76c0bd3e6fae611c9ac460
                      width: 351
                      height: 656
                      is_public: true
                      ip_address: 127.0.0.1
                      expired_at: null
                      created_at: '2024-10-17T07:42:51.000000Z'
                      thumbnail_url: >-
                        http://127.0.0.1:8000/uploads/20241017/5de83214350f1daa2806a1df507d6546.png
                      public_url: >-
                        http://127.0.0.1:8000/uploads/20241017/5de83214350f1daa2806a1df507d6546.png
                      group:
                        id: 1
                        name: 系统默认组
                        intro: 这是系统默认角色组
                      storage:
                        id: 1
                        name: 本地储存
                        intro: 这是本地储存驱动
                        provider: local
                      albums: []
                      tags: []
                  links:
                    first: http://127.0.0.1:8000/api/v2/user/photos?page=1
                    last: http://127.0.0.1:8000/api/v2/user/photos?page=1
                    prev: null
                    next: null
                  meta:
                    current_page: 1
                    from: 1
                    last_page: 1
                    links:
                      - url: null
                        label: '&laquo; 上一页'
                        active: false
                      - url: http://127.0.0.1:8000/api/v2/user/photos?page=1
                        label: '1'
                        active: true
                      - url: null
                        label: 下一页 &raquo;
                        active: false
                    path: http://127.0.0.1:8000/api/v2/user/photos
                    per_page: 20
                    to: 11
                    total: 11
                time: 1730872842
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: 用户/图库
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-188761179-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```# 图片详情

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/photos/{id}:
    get:
      summary: 图片详情
      deprecated: false
      description: ''
      tags:
        - 用户/图库
      parameters:
        - name: id
          in: path
          description: 图片ID
          required: true
          example: 1
          schema:
            type: integer
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  message:
                    type: string
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: integer
                          description: 图片ID
                        name:
                          type: string
                          description: 自定义名称
                        intro:
                          type: string
                          description: 简介
                        filename:
                          type: string
                          description: 文件名
                        pathname:
                          type: string
                          description: 文件路径名
                        mimetype:
                          type: string
                          description: 文件类型
                        extension:
                          type: string
                          description: 拓展名
                        md5:
                          type: string
                          description: md5值
                        sha1:
                          type: string
                          description: sha1值
                        width:
                          type: integer
                          description: 宽度
                        height:
                          type: integer
                          description: 高度
                        is_public:
                          type: boolean
                          description: 是否公开
                        ip_address:
                          type: string
                          description: 上传ip地址
                        expired_at:
                          type: 'null'
                          description: 到期时间
                        created_at:
                          type: string
                          description: 创建时间
                        group:
                          type: object
                          properties:
                            id:
                              type: integer
                              description: 角色组ID
                            name:
                              type: string
                              description: 角色组名称
                            intro:
                              type: string
                              description: 角色组简介
                          required:
                            - id
                            - name
                            - intro
                          description: 所在角色组信息
                          x-apifox-orders:
                            - id
                            - name
                            - intro
                        storage:
                          type: object
                          properties:
                            id:
                              type: integer
                              description: 储存ID
                            name:
                              type: string
                              description: 储存名称
                            intro:
                              type: string
                              description: 储存简介
                            provider:
                              type: string
                              enum:
                                - local
                                - s3
                                - oss
                                - cos
                                - qiniu
                                - upyun
                                - sftp
                                - ftp
                                - webdav
                              x-apifox:
                                enumDescriptions:
                                  local: 本地
                                  s3: AWS S3
                                  oss: 阿里云 OSS
                                  cos: 腾讯云 COS
                                  qiniu: 七牛云 Kodo
                                  upyun: 又拍云 USS
                                  sftp: Sftp
                                  ftp: Ftp
                                  webdav: Webdav
                              description: 储存提供者
                          required:
                            - id
                            - name
                            - intro
                            - provider
                          description: 所在储存信息
                          x-apifox-orders:
                            - id
                            - name
                            - intro
                            - provider
                        album:
                          type: object
                          properties:
                            id:
                              type: integer
                              description: 相册ID
                            name:
                              type: string
                              description: 相册名称
                            intro:
                              type: string
                              description: 相册简介
                          required:
                            - id
                            - name
                            - intro
                          x-apifox-orders:
                            - id
                            - name
                            - intro
                          description: 所在相册信息
                        tags:
                          type: array
                          items:
                            type: object
                            properties:
                              id:
                                type: integer
                                description: 标签ID
                              name:
                                type: string
                                description: 标签名称
                            required:
                              - id
                              - name
                            x-apifox-orders:
                              - id
                              - name
                          description: 标签信息
                      x-apifox-orders:
                        - id
                        - name
                        - intro
                        - filename
                        - pathname
                        - mimetype
                        - extension
                        - md5
                        - sha1
                        - width
                        - height
                        - is_public
                        - ip_address
                        - expired_at
                        - created_at
                        - group
                        - storage
                        - album
                        - tags
                  time:
                    type: integer
                required:
                  - status
                  - message
                  - data
                  - time
                x-apifox-orders:
                  - status
                  - message
                  - data
                  - time
              example:
                status: success
                message: successful
                data:
                  id: 23
                  name: 落魄程序员在线炒粉
                  intro: ''
                  filename: 落魄程序员在线炒粉.gif
                  pathname: 20240629/6a39702c8347047c6749854a40831de0.gif
                  mimetype: image/gif
                  extension: gif
                  md5: 6a39702c8347047c6749854a40831de0
                  sha1: 570bdc9ae184db710ee74824a15725d5ed3db589
                  width: 282
                  height: 282
                  is_public: false
                  ip_address: 127.0.0.1
                  expired_at: null
                  created_at: '2024-06-29T10:58:23.000000Z'
                  tags:
                    - id: 5
                      name: 街头摄影
                    - id: 9
                      name: 城市建筑
                  group:
                    id: 1
                    name: 系统默认组
                    intro: 这是系统默认角色组
                  storage:
                    id: 1
                    name: 本地储存
                    intro: 这是本地储存驱动
                    provider: local
                  album:
                    id: 1
                    name: 街头摄影
                    intro: 这是测试相册
                time: 1719659648
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: 用户/图库
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-189010509-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```# 修改图片信息

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/photos/{id}:
    put:
      summary: 修改图片信息
      deprecated: false
      description: ''
      tags:
        - 用户/图库
      parameters:
        - name: id
          in: path
          description: 图片ID
          required: true
          example: 20
          schema:
            type: integer
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: 名称
                  x-apifox-mock: '{{$lorem.sentence(locale=''zh_CN'')}}'
                intro:
                  type: string
                  description: 简介
                  x-apifox-mock: '{{$lorem.sentence(locale=''zh_CN'')}}'
                is_public:
                  type: boolean
                  description: 是否公开
                  x-apifox-mock: '{{$datatype.boolean}}'
                tags:
                  type: array
                  items:
                    type: string
                  description: 标签
              x-apifox-orders:
                - name
                - intro
                - is_public
                - tags
              required:
                - name
                - is_public
                - tags
            example:
              name: 果程究热
              intro: 转周收或车构亲九真省千动记界一。
              is_public: true
      responses:
        '204':
          description: ''
          content:
            '*/*':
              schema:
                type: object
                properties: {}
          headers: {}
          x-apifox-name: 修改成功
      security: []
      x-apifox-folder: 用户/图库
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-189010761-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```# 删除图片

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/photos:
    delete:
      summary: 删除图片
      deprecated: false
      description: ''
      tags:
        - 用户/图库
      parameters:
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      requestBody:
        content:
          application/json:
            schema:
              type: array
              items:
                type: integer
                description: 图片ID
            example:
              - 76
              - 90
              - 26
      responses:
        '204':
          description: ''
          content:
            '*/*':
              schema:
                type: object
                properties: {}
          headers: {}
          x-apifox-name: 删除成功
      security: []
      x-apifox-folder: 用户/图库
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-189011116-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```# 附加标签

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/photos/{id}/tags:
    post:
      summary: 附加标签
      deprecated: false
      description: ''
      tags:
        - 用户/图库
      parameters:
        - name: id
          in: path
          description: 图片ID
          required: true
          example: 1
          schema:
            type: integer
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      requestBody:
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties: {}
                x-apifox-orders: []
            example:
              - 测试1
              - 测试2
      responses:
        '201':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                  message:
                    type: string
                  time:
                    type: integer
                required:
                  - status
                  - message
                  - time
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: 用户/图库
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-190616227-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```# 移除标签

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/photos/{id}/tags:
    delete:
      summary: 移除标签
      deprecated: false
      description: ''
      tags:
        - 用户/图库
      parameters:
        - name: id
          in: path
          description: 图片ID
          required: true
          example: 1
          schema:
            type: integer
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      requestBody:
        content:
          application/json:
            schema:
              type: array
              items:
                type: object
                properties: {}
                x-apifox-orders: []
            example:
              - 测试1
              - 测试2
      responses:
        '204':
          description: ''
          content:
            '*/*':
              schema:
                type: object
                properties: {}
          headers: {}
          x-apifox-name: 移除成功
      security: []
      x-apifox-folder: 用户/图库
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-190616273-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```# 批量修改图片信息

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /user/photos/update:
    put:
      summary: 批量修改图片信息
      deprecated: false
      description: ''
      tags:
        - 用户/图库
      parameters:
        - name: Accept
          in: header
          description: ''
          required: false
          example: application/json
          schema:
            type: string
        - name: Authorization
          in: header
          description: ''
          required: false
          example: Bearer {{token}}
          schema:
            type: string
            default: Bearer {{token}}
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: 名称
                  x-apifox-mock: '{{$lorem.sentence(locale=''zh_CN'')}}'
                intro:
                  type: string
                  description: 简介
                  x-apifox-mock: '{{$lorem.sentence(locale=''zh_CN'')}}'
                is_public:
                  type: boolean
                  description: 是否公开
                  x-apifox-mock: '{{$datatype.boolean}}'
                tags:
                  type: array
                  items:
                    type: string
                  description: 标签
                ids:
                  type: array
                  items:
                    type: integer
                  description: 图片id
              x-apifox-orders:
                - name
                - intro
                - is_public
                - tags
                - ids
              required:
                - name
                - is_public
                - tags
                - ids
            example:
              ids: []
              name: 果程究热
              intro: 转周收或车构亲九真省千动记界一。
              is_public: true
      responses:
        '204':
          description: ''
          content:
            '*/*':
              schema:
                type: object
                properties: {}
          headers: {}
          x-apifox-name: 修改成功
      security: []
      x-apifox-folder: 用户/图库
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4596809/apis/api-291491222-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: http://127.0.0.1:8000/api/v2
    description: 开发环境
security: []

```