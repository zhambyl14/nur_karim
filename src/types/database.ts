export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      banners: {
        Row: {
          button_kk: string
          button_ru: string
          created_at: string
          ends_at: string | null
          id: string
          image_mobile_url: string | null
          image_url: string
          is_active: boolean
          is_demo: boolean
          link_url: string | null
          overlay: boolean
          sort_order: number
          starts_at: string | null
          subtitle_kk: string
          subtitle_ru: string
          text_theme: string
          title_kk: string
          title_ru: string
        }
        Insert: {
          button_kk?: string
          button_ru?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          image_mobile_url?: string | null
          image_url: string
          is_active?: boolean
          is_demo?: boolean
          link_url?: string | null
          overlay?: boolean
          sort_order?: number
          starts_at?: string | null
          subtitle_kk?: string
          subtitle_ru?: string
          text_theme?: string
          title_kk?: string
          title_ru?: string
        }
        Update: {
          button_kk?: string
          button_ru?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          image_mobile_url?: string | null
          image_url?: string
          is_active?: boolean
          is_demo?: boolean
          link_url?: string | null
          overlay?: boolean
          sort_order?: number
          starts_at?: string | null
          subtitle_kk?: string
          subtitle_ru?: string
          text_theme?: string
          title_kk?: string
          title_ru?: string
        }
        Relationships: []
      }
      books: {
        Row: {
          author: string
          catalog_no: number
          cover_palette: number
          cover_type: string | null
          cover_url: string | null
          created_at: string
          description_kk: string
          description_ru: string
          ebook_enabled: boolean
          ebook_page_count: number
          ebook_preview_pages: number
          ebook_price: number | null
          ebook_version: number
          genre_id: string | null
          id: string
          images: string[]
          is_demo: boolean
          is_featured: boolean
          is_published: boolean
          isbn: string | null
          language: string
          pages: number | null
          paper_enabled: boolean
          paper_price: number | null
          publish_year: number | null
          publisher: string | null
          rating_avg: number
          rating_count: number
          search_text: string | null
          slug: string
          sold_count: number
          stock: number
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          catalog_no?: never
          cover_palette?: number
          cover_type?: string | null
          cover_url?: string | null
          created_at?: string
          description_kk?: string
          description_ru?: string
          ebook_enabled?: boolean
          ebook_page_count?: number
          ebook_preview_pages?: number
          ebook_price?: number | null
          ebook_version?: number
          genre_id?: string | null
          id?: string
          images?: string[]
          is_demo?: boolean
          is_featured?: boolean
          is_published?: boolean
          isbn?: string | null
          language?: string
          pages?: number | null
          paper_enabled?: boolean
          paper_price?: number | null
          publish_year?: number | null
          publisher?: string | null
          rating_avg?: number
          rating_count?: number
          search_text?: string | null
          slug: string
          sold_count?: number
          stock?: number
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          catalog_no?: never
          cover_palette?: number
          cover_type?: string | null
          cover_url?: string | null
          created_at?: string
          description_kk?: string
          description_ru?: string
          ebook_enabled?: boolean
          ebook_page_count?: number
          ebook_preview_pages?: number
          ebook_price?: number | null
          ebook_version?: number
          genre_id?: string | null
          id?: string
          images?: string[]
          is_demo?: boolean
          is_featured?: boolean
          is_published?: boolean
          isbn?: string | null
          language?: string
          pages?: number | null
          paper_enabled?: boolean
          paper_price?: number | null
          publish_year?: number | null
          publisher?: string | null
          rating_avg?: number
          rating_count?: number
          search_text?: string | null
          slug?: string
          sold_count?: number
          stock?: number
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          book_id: string
          created_at: string
          format: Database["public"]["Enums"]["book_format"]
          quantity: number
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          format: Database["public"]["Enums"]["book_format"]
          quantity?: number
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          format?: Database["public"]["Enums"]["book_format"]
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "catalog_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          admin_unread: number
          book_id: string | null
          created_at: string
          id: string
          is_closed: boolean
          last_message_at: string
          last_message_preview: string
          last_sender_is_admin: boolean
          order_id: string | null
          subject: string
          user_id: string
          user_unread: number
        }
        Insert: {
          admin_unread?: number
          book_id?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          last_message_at?: string
          last_message_preview?: string
          last_sender_is_admin?: boolean
          order_id?: string | null
          subject?: string
          user_id: string
          user_unread?: number
        }
        Update: {
          admin_unread?: number
          book_id?: string | null
          created_at?: string
          id?: string
          is_closed?: boolean
          last_message_at?: string
          last_message_preview?: string
          last_sender_is_admin?: boolean
          order_id?: string | null
          subject?: string
          user_id?: string
          user_unread?: number
        }
        Relationships: [
          {
            foreignKeyName: "conversations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "catalog_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ebook_access_log: {
        Row: {
          book_id: string | null
          created_at: string
          device_id: string | null
          id: number
          ip: string | null
          page: number
          user_id: string | null
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          device_id?: string | null
          id?: never
          ip?: string | null
          page: number
          user_id?: string | null
        }
        Update: {
          book_id?: string | null
          created_at?: string
          device_id?: string | null
          id?: never
          ip?: string | null
          page?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ebook_access_log_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ebook_access_log_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "catalog_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ebook_access_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ebook_devices: {
        Row: {
          device_id: string
          first_seen: string
          id: string
          label: string
          last_seen: string
          user_id: string
        }
        Insert: {
          device_id: string
          first_seen?: string
          id?: string
          label?: string
          last_seen?: string
          user_id: string
        }
        Update: {
          device_id?: string
          first_seen?: string
          id?: string
          label?: string
          last_seen?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ebook_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlements: {
        Row: {
          book_id: string
          created_at: string
          gift_id: string | null
          order_id: string | null
          source: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          gift_id?: string | null
          order_id?: string | null
          source: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          gift_id?: string | null
          order_id?: string | null
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "catalog_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          book_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "catalog_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_kk: string
          name_ru: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_kk: string
          name_ru: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_kk?: string
          name_ru?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      gifts: {
        Row: {
          address_mode: Database["public"]["Enums"]["gift_address_mode"]
          address_submitted_at: string | null
          card_theme: string
          claimed_at: string | null
          code: string
          created_at: string
          hide_price: boolean
          id: string
          is_anonymous: boolean
          message: string
          opened_at: string | null
          order_id: string
          recipient_name: string
          recipient_phone: string
          recipient_user_id: string | null
          reveal_at: string | null
          sender_id: string | null
          sender_name: string
          status: Database["public"]["Enums"]["gift_status"]
          thank_you_message: string | null
          thanked_at: string | null
        }
        Insert: {
          address_mode?: Database["public"]["Enums"]["gift_address_mode"]
          address_submitted_at?: string | null
          card_theme?: string
          claimed_at?: string | null
          code: string
          created_at?: string
          hide_price?: boolean
          id?: string
          is_anonymous?: boolean
          message?: string
          opened_at?: string | null
          order_id: string
          recipient_name: string
          recipient_phone: string
          recipient_user_id?: string | null
          reveal_at?: string | null
          sender_id?: string | null
          sender_name: string
          status?: Database["public"]["Enums"]["gift_status"]
          thank_you_message?: string | null
          thanked_at?: string | null
        }
        Update: {
          address_mode?: Database["public"]["Enums"]["gift_address_mode"]
          address_submitted_at?: string | null
          card_theme?: string
          claimed_at?: string | null
          code?: string
          created_at?: string
          hide_price?: boolean
          id?: string
          is_anonymous?: boolean
          message?: string
          opened_at?: string | null
          order_id?: string
          recipient_name?: string
          recipient_phone?: string
          recipient_user_id?: string | null
          reveal_at?: string | null
          sender_id?: string | null
          sender_name?: string
          status?: Database["public"]["Enums"]["gift_status"]
          thank_you_message?: string | null
          thanked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gifts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          is_admin: boolean
          sender_id: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          is_admin?: boolean
          sender_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          author: string
          book_id: string | null
          cover_palette: number
          cover_url: string | null
          format: Database["public"]["Enums"]["book_format"]
          genre_id: string | null
          id: string
          line_total: number
          order_id: string
          promo_discount: number
          promotion_id: string | null
          quantity: number
          title: string
          unit_final_price: number
          unit_price: number
        }
        Insert: {
          author?: string
          book_id?: string | null
          cover_palette?: number
          cover_url?: string | null
          format: Database["public"]["Enums"]["book_format"]
          genre_id?: string | null
          id?: string
          line_total: number
          order_id: string
          promo_discount?: number
          promotion_id?: string | null
          quantity: number
          title: string
          unit_final_price: number
          unit_price: number
        }
        Update: {
          author?: string
          book_id?: string | null
          cover_palette?: number
          cover_url?: string | null
          format?: Database["public"]["Enums"]["book_format"]
          genre_id?: string | null
          id?: string
          line_total?: number
          order_id?: string
          promo_discount?: number
          promotion_id?: string | null
          quantity?: number
          title?: string
          unit_final_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "catalog_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: number
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: never
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: never
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_note: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          contact_name: string
          contact_phone: string
          created_at: string
          customer_note: string | null
          delivered_at: string | null
          delivery_apartment: string | null
          delivery_city: string | null
          delivery_comment: string | null
          delivery_entrance: string | null
          delivery_house: string | null
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          delivery_postal_code: string | null
          delivery_price: number
          delivery_region: string | null
          delivery_street: string | null
          gift_wrap: boolean
          gift_wrap_price: number
          has_ebook: boolean
          has_paper: boolean
          id: string
          is_gift: boolean
          items_subtotal: number
          order_number: number
          payment_confirmed_at: string | null
          payment_confirmed_by: string | null
          payment_marked_at: string | null
          payment_receipt_path: string | null
          promo_code: string | null
          promo_code_id: string | null
          promo_discount: number
          promotion_discount: number
          recipient_name: string | null
          recipient_phone: string | null
          shipped_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          total: number
          tracking_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          contact_name: string
          contact_phone: string
          created_at?: string
          customer_note?: string | null
          delivered_at?: string | null
          delivery_apartment?: string | null
          delivery_city?: string | null
          delivery_comment?: string | null
          delivery_entrance?: string | null
          delivery_house?: string | null
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          delivery_postal_code?: string | null
          delivery_price?: number
          delivery_region?: string | null
          delivery_street?: string | null
          gift_wrap?: boolean
          gift_wrap_price?: number
          has_ebook?: boolean
          has_paper?: boolean
          id?: string
          is_gift?: boolean
          items_subtotal?: number
          order_number?: never
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_marked_at?: string | null
          payment_receipt_path?: string | null
          promo_code?: string | null
          promo_code_id?: string | null
          promo_discount?: number
          promotion_discount?: number
          recipient_name?: string | null
          recipient_phone?: string | null
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          contact_name?: string
          contact_phone?: string
          created_at?: string
          customer_note?: string | null
          delivered_at?: string | null
          delivery_apartment?: string | null
          delivery_city?: string | null
          delivery_comment?: string | null
          delivery_entrance?: string | null
          delivery_house?: string | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          delivery_postal_code?: string | null
          delivery_price?: number
          delivery_region?: string | null
          delivery_street?: string | null
          gift_wrap?: boolean
          gift_wrap_price?: number
          has_ebook?: boolean
          has_paper?: boolean
          id?: string
          is_gift?: boolean
          items_subtotal?: number
          order_number?: never
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_marked_at?: string | null
          payment_receipt_path?: string | null
          promo_code?: string | null
          promo_code_id?: string | null
          promo_discount?: number
          promotion_discount?: number
          recipient_name?: string | null
          recipient_phone?: string | null
          shipped_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_payment_confirmed_by_fkey"
            columns: ["payment_confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          locale: string
          phone: string
          role: Database["public"]["Enums"]["user_role"]
          saved_address: Json | null
          telegram_id: number | null
          telegram_username: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          locale?: string
          phone: string
          role?: Database["public"]["Enums"]["user_role"]
          saved_address?: Json | null
          telegram_id?: number | null
          telegram_username?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          locale?: string
          phone?: string
          role?: Database["public"]["Enums"]["user_role"]
          saved_address?: Json | null
          telegram_id?: number | null
          telegram_username?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_code_books: {
        Row: {
          book_id: string
          promo_code_id: string
        }
        Insert: {
          book_id: string
          promo_code_id: string
        }
        Update: {
          book_id?: string
          promo_code_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "catalog_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_books_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_uses: {
        Row: {
          created_at: string
          discount: number
          id: string
          order_id: string
          promo_code_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          discount?: number
          id?: string
          order_id: string
          promo_code_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          discount?: number
          id?: string
          order_id?: string
          promo_code_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_uses_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_uses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          description: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at: string | null
          format_scope: Database["public"]["Enums"]["format_scope"]
          genre_id: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          max_uses: number | null
          min_order_amount: number
          per_user_limit: number | null
          scope: Database["public"]["Enums"]["promo_scope"]
          starts_at: string | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at?: string | null
          format_scope?: Database["public"]["Enums"]["format_scope"]
          genre_id?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          max_uses?: number | null
          min_order_amount?: number
          per_user_limit?: number | null
          scope?: Database["public"]["Enums"]["promo_scope"]
          starts_at?: string | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          ends_at?: string | null
          format_scope?: Database["public"]["Enums"]["format_scope"]
          genre_id?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          max_uses?: number | null
          min_order_amount?: number
          per_user_limit?: number | null
          scope?: Database["public"]["Enums"]["promo_scope"]
          starts_at?: string | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_books: {
        Row: {
          book_id: string
          promotion_id: string
        }
        Insert: {
          book_id: string
          promotion_id: string
        }
        Update: {
          book_id?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "catalog_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_books_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at: string | null
          format_scope: Database["public"]["Enums"]["format_scope"]
          genre_id: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          scope: Database["public"]["Enums"]["promo_scope"]
          starts_at: string | null
          title_kk: string
          title_ru: string
        }
        Insert: {
          created_at?: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          ends_at?: string | null
          format_scope?: Database["public"]["Enums"]["format_scope"]
          genre_id?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          scope?: Database["public"]["Enums"]["promo_scope"]
          starts_at?: string | null
          title_kk?: string
          title_ru?: string
        }
        Update: {
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          ends_at?: string | null
          format_scope?: Database["public"]["Enums"]["format_scope"]
          genre_id?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          scope?: Database["public"]["Enums"]["promo_scope"]
          starts_at?: string | null
          title_kk?: string
          title_ru?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          book_id: string
          page: number
          page_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          page?: number
          page_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          page?: number
          page_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "catalog_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          admin_reply: string | null
          admin_reply_at: string | null
          author_name: string
          body: string
          book_id: string
          created_at: string
          id: string
          is_hidden: boolean
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          author_name?: string
          body?: string
          book_id: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          admin_reply_at?: string | null
          author_name?: string
          body?: string
          book_id?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "catalog_books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          address_kk: string
          address_ru: string
          contact_email: string | null
          contact_phone: string
          delivery_astana_price: number
          delivery_kazpost_price: number
          ebook_max_devices: number
          ebook_pages_per_10min: number
          ebook_watermark: boolean
          free_delivery_threshold: number | null
          gift_enabled: boolean
          gift_wrap_price: number
          hero_label_kk: string
          hero_label_ru: string
          hero_quote_kk: string
          hero_quote_ru: string
          hero_sub_kk: string
          hero_sub_ru: string
          id: number
          instagram_url: string | null
          order_auto_cancel_hours: number
          payment_bank: string
          payment_note_kk: string
          payment_note_ru: string
          payment_phone: string
          payment_recipient: string
          store_name: string
          telegram_notify_admins: boolean
          telegram_url: string | null
          updated_at: string
          whatsapp_phone: string | null
        }
        Insert: {
          address_kk?: string
          address_ru?: string
          contact_email?: string | null
          contact_phone?: string
          delivery_astana_price?: number
          delivery_kazpost_price?: number
          ebook_max_devices?: number
          ebook_pages_per_10min?: number
          ebook_watermark?: boolean
          free_delivery_threshold?: number | null
          gift_enabled?: boolean
          gift_wrap_price?: number
          hero_label_kk?: string
          hero_label_ru?: string
          hero_quote_kk?: string
          hero_quote_ru?: string
          hero_sub_kk?: string
          hero_sub_ru?: string
          id?: number
          instagram_url?: string | null
          order_auto_cancel_hours?: number
          payment_bank?: string
          payment_note_kk?: string
          payment_note_ru?: string
          payment_phone?: string
          payment_recipient?: string
          store_name?: string
          telegram_notify_admins?: boolean
          telegram_url?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Update: {
          address_kk?: string
          address_ru?: string
          contact_email?: string | null
          contact_phone?: string
          delivery_astana_price?: number
          delivery_kazpost_price?: number
          ebook_max_devices?: number
          ebook_pages_per_10min?: number
          ebook_watermark?: boolean
          free_delivery_threshold?: number | null
          gift_enabled?: boolean
          gift_wrap_price?: number
          hero_label_kk?: string
          hero_label_ru?: string
          hero_quote_kk?: string
          hero_quote_ru?: string
          hero_sub_kk?: string
          hero_sub_ru?: string
          id?: number
          instagram_url?: string | null
          order_auto_cancel_hours?: number
          payment_bank?: string
          payment_note_kk?: string
          payment_note_ru?: string
          payment_phone?: string
          payment_recipient?: string
          store_name?: string
          telegram_notify_admins?: boolean
          telegram_url?: string | null
          updated_at?: string
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      telegram_tokens: {
        Row: {
          created_at: string
          expires_at: string
          first_name: string | null
          id: string
          language_code: string | null
          last_name: string | null
          phone: string
          purpose: string
          telegram_id: number
          telegram_username: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          first_name?: string | null
          id?: string
          language_code?: string | null
          last_name?: string | null
          phone: string
          purpose: string
          telegram_id: number
          telegram_username?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          first_name?: string | null
          id?: string
          language_code?: string | null
          last_name?: string | null
          phone?: string
          purpose?: string
          telegram_id?: number
          telegram_username?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      catalog_books: {
        Row: {
          author: string | null
          catalog_no: number | null
          cover_palette: number | null
          cover_type: string | null
          cover_url: string | null
          created_at: string | null
          description_kk: string | null
          description_ru: string | null
          discount_pct: number | null
          ebook_available: boolean | null
          ebook_enabled: boolean | null
          ebook_final_price: number | null
          ebook_page_count: number | null
          ebook_preview_pages: number | null
          ebook_price: number | null
          ebook_promotion_id: string | null
          genre_id: string | null
          genre_name_kk: string | null
          genre_name_ru: string | null
          genre_slug: string | null
          id: string | null
          images: string[] | null
          is_demo: boolean | null
          is_featured: boolean | null
          is_published: boolean | null
          isbn: string | null
          language: string | null
          min_price: number | null
          pages: number | null
          paper_enabled: boolean | null
          paper_final_price: number | null
          paper_price: number | null
          paper_promotion_id: string | null
          publish_year: number | null
          publisher: string | null
          rating_avg: number | null
          rating_count: number | null
          search_text: string | null
          slug: string | null
          sold_count: number | null
          stock: number | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _quote_cart: {
        Args: {
          p_delivery_method: string
          p_gift_wrap: boolean
          p_is_gift: boolean
          p_items: Json
          p_promo_code: string
          p_user: string
        }
        Returns: Json
      }
      admin_counters: { Args: never; Returns: Json }
      admin_customers: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort?: string
        }
        Returns: Json
      }
      admin_dashboard: { Args: { p_from: string; p_to: string }; Returns: Json }
      admin_delete_demo_data: { Args: never; Returns: Json }
      admin_update_order: {
        Args: {
          p_admin_note?: string
          p_cancel_reason?: string
          p_note?: string
          p_order_id: string
          p_status?: Database["public"]["Enums"]["order_status"]
          p_tracking_number?: string
        }
        Returns: Json
      }
      attach_pending_gifts: {
        Args: { p_phone: string; p_user: string }
        Returns: undefined
      }
      best_price: {
        Args: {
          p_book_id: string
          p_format: Database["public"]["Enums"]["book_format"]
          p_genre_id: string
          p_price: number
        }
        Returns: {
          final_price: number
          promotion_id: string
        }[]
      }
      cancel_my_order: { Args: { p_order_id: string }; Returns: Json }
      cancel_stale_orders: { Args: never; Returns: number }
      catalog_stats: { Args: never; Returns: Json }
      claim_gift: { Args: { p_code: string }; Returns: Json }
      cleanup_housekeeping: { Args: never; Returns: undefined }
      create_order: { Args: { p_payload: Json }; Returns: Json }
      get_gift: { Args: { p_code: string }; Returns: Json }
      has_purchased: { Args: { p_book_id: string }; Returns: boolean }
      immutable_array_to_string: {
        Args: { arr: string[]; sep: string }
        Returns: string
      }
      is_admin: { Args: never; Returns: boolean }
      list_authors: {
        Args: never
        Returns: {
          author: string
          books_count: number
        }[]
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      mark_order_paid: {
        Args: { p_order_id: string; p_receipt_path?: string }
        Returns: Json
      }
      mask_phone: { Args: { p: string }; Returns: string }
      my_counters: { Args: never; Returns: Json }
      normalize_phone: { Args: { p: string }; Returns: string }
      open_gift: { Args: { p_code: string }; Returns: Json }
      quote_cart: {
        Args: {
          p_delivery_method?: string
          p_gift_wrap?: boolean
          p_is_gift?: boolean
          p_items: Json
          p_promo_code?: string
        }
        Returns: Json
      }
      random_code: { Args: { n_bytes?: number }; Returns: string }
      received_gifts: { Args: never; Returns: Json }
      replace_cart: { Args: { p_items: Json }; Returns: undefined }
      send_gift_thanks: {
        Args: { p_code: string; p_message: string; p_phone: string }
        Returns: Json
      }
      start_conversation: {
        Args: { p_body: string; p_book_id?: string; p_order_id?: string }
        Returns: string
      }
      submit_gift_address: {
        Args: { p_address: Json; p_code: string; p_phone: string }
        Returns: Json
      }
    }
    Enums: {
      book_format: "paper" | "ebook"
      delivery_method: "astana_courier" | "kazpost" | "digital"
      discount_type: "percent" | "fixed"
      format_scope: "any" | "paper" | "ebook"
      gift_address_mode: "sender" | "recipient"
      gift_status: "pending" | "active" | "opened" | "claimed" | "cancelled"
      order_status:
        | "pending_payment"
        | "payment_review"
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
      promo_scope: "all" | "genre" | "books"
      user_role: "client" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      book_format: ["paper", "ebook"],
      delivery_method: ["astana_courier", "kazpost", "digital"],
      discount_type: ["percent", "fixed"],
      format_scope: ["any", "paper", "ebook"],
      gift_address_mode: ["sender", "recipient"],
      gift_status: ["pending", "active", "opened", "claimed", "cancelled"],
      order_status: [
        "pending_payment",
        "payment_review",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
      ],
      promo_scope: ["all", "genre", "books"],
      user_role: ["client", "admin"],
    },
  },
} as const
