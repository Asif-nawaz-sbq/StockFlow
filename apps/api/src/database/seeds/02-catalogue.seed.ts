import { DataSource } from 'typeorm';
import { Customer } from 'src/modules/customers/entities/customer.entity';
import { Product } from 'src/modules/products/entities/product.entity';
import { ProductSupplier } from 'src/modules/products/entities/product-supplier.entity';
import { Supplier } from 'src/modules/suppliers/entities/supplier.entity';
import { CUSTOMERS, PRODUCTS, SUPPLIERS } from './data/catalogue';

export interface CatalogueSeedResult {
  suppliers: Supplier[];
  products: Product[];
  customers: Customer[];
}

export async function seedCatalogue(
  dataSource: DataSource,
  tenantId: string,
): Promise<CatalogueSeedResult> {
  const supplierRepo = dataSource.getRepository(Supplier);
  const productRepo = dataSource.getRepository(Product);
  const linkRepo = dataSource.getRepository(ProductSupplier);
  const customerRepo = dataSource.getRepository(Customer);

  const suppliers = await supplierRepo.save(
    SUPPLIERS.map((s) => supplierRepo.create({ ...s, tenantId, isActive: true })),
  );
  const supplierByCode = new Map(suppliers.map((s) => [s.code, s]));

  const products = await productRepo.save(
    PRODUCTS.map((p) =>
      productRepo.create({
        tenantId,
        sku: p.sku,
        name: p.name,
        description: p.description,
        category: p.category,
        ean: p.ean,
        unit: p.unit,
        sellPriceCents: p.sellPriceCents,
        currency: 'EUR',
        vatRate: p.vatRate,
        reorderPoint: p.reorderPoint,
        reorderQuantity: p.reorderQuantity,
        weightGrams: p.weightGrams,
        isActive: true,
      }),
    ),
  );
  const productBySku = new Map(products.map((p) => [p.sku, p]));

  const links: ProductSupplier[] = [];
  for (const seed of PRODUCTS) {
    const product = productBySku.get(seed.sku);
    const supplier = supplierByCode.get(seed.supplierCode);
    if (!product || !supplier) continue;

    links.push(
      linkRepo.create({
        tenantId,
        productId: product.id,
        supplierId: supplier.id,
        supplierSku: `${supplier.code.slice(-3)}-${seed.sku.slice(-4)}`,
        costPriceCents: seed.costPriceCents,
        minOrderQty: seed.minOrderQty,
        isPreferred: true,
      }),
    );
  }
  await linkRepo.save(links);

  const customers = await customerRepo.save(
    CUSTOMERS.map((c) =>
      customerRepo.create({ ...c, tenantId, billingCountry: 'DE', isActive: true }),
    ),
  );

  return { suppliers, products, customers };
}
